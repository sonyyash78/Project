from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from app.database.mongo import get_collection
from app.schemas.payment import CreateOrderRequest, CreateOrderResponse, VerifyPaymentRequest
from app.services.razorpay_service import create_razorpay_order, verify_payment_signature, verify_webhook_signature
from app.utils.auth import get_current_user_id

router = APIRouter(prefix="/payments", tags=["Payments"])
payments_collection = get_collection("payments")
users_collection = get_collection("users")

@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(payload: CreateOrderRequest, user_id: str = Depends(get_current_user_id)):
    # Prevent multi-orders active logic can be placed here if needed.
    amount_in_paise = int(payload.amount * 100)
    
    razorpay_order = create_razorpay_order(amount_in_paise)
    
    payment_doc = {
        "order_id": razorpay_order["id"],
        "user_id": user_id,
        "amount": payload.amount,
        "currency": "INR",
        "status": "created",
        "created_at": datetime.utcnow()
    }
    await payments_collection.insert_one(payment_doc)
    
    return {
        "order_id": razorpay_order["id"],
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"],
        "key_id": razorpay_order["entity"]
    }

@router.post("/verify-payment")
async def verify_payment(payload: VerifyPaymentRequest, user_id: str = Depends(get_current_user_id)):
    is_valid = verify_payment_signature(
        payload.razorpay_order_id, 
        payload.razorpay_payment_id, 
        payload.razorpay_signature
    )
    
    if not is_valid:
        await payments_collection.update_one(
            {"order_id": payload.razorpay_order_id},
            {"$set": {"status": "failed", "razorpay_signature": payload.razorpay_signature}}
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment signature verification failed")
    
    expiry_date = datetime.utcnow() + timedelta(days=30)  # 30 days subscription tier
    
    # Update payment record
    result = await payments_collection.update_one(
        {"order_id": payload.razorpay_order_id},
        {
            "$set": {
                "payment_id": payload.razorpay_payment_id,
                "status": "captured",
                "razorpay_signature": payload.razorpay_signature,
                "expiry_date": expiry_date
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order tracking document not found")
        
    # Activate User Premium tier
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"is_premium": True, "premium_expiry": expiry_date}}
    )
    
    return {"status": "success", "message": "Subscription activated successfully."}

@router.post("/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None)):
    if not x_razorpay_signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook signature missing")
        
    body = await request.body()
    if not verify_webhook_signature(body, x_razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")
        
    data = await request.json()
    event = data.get("event")
    
    if event in ["payment.captured", "order.paid"]:
        entity = data["payload"]["payment"]["entity"] if "payment" in data["payload"] else data["payload"]["order"]["entity"]
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        payment_method = entity.get("method")
        
        payment_record = await payments_collection.find_one({"order_id": order_id})
        if payment_record and payment_record["status"] != "captured":
            expiry_date = datetime.utcnow() + timedelta(days=30)
            await payments_collection.update_one(
                {"order_id": order_id},
                {"$set": {"status": "captured", "payment_id": payment_id, "payment_method": payment_method, "expiry_date": expiry_date}}
            )
            await users_collection.update_one(
                {"_id": payment_record["user_id"]},
                {"$set": {"is_premium": True, "premium_expiry": expiry_date}}
            )
            
    elif event == "payment.failed":
        entity = data["payload"]["payment"]["entity"]
        order_id = entity.get("order_id")
        await payments_collection.update_one(
            {"order_id": order_id},
            {"$set": {"status": "failed"}}
        )
        
    return {"status": "accepted"}

@router.get("/history")
async def get_payment_history(user_id: str = Depends(get_current_user_id)):
    cursor = payments_collection.find({"user_id": user_id}).sort("created_at", -1)
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("expiry_date"):
            doc["expiry_date"] = doc["expiry_date"].isoformat()
        doc["created_at"] = doc["created_at"].isoformat()
        history.append(doc)
    return history