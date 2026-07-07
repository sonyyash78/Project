Razorpay Integration — Setup & Testing

1) Environment (.env)

Add the following to your backend .env (do NOT commit):

RAZORPAY_KEY_ID=rzp_test_yourkeyid
RAZORPAY_KEY_SECRET=rzp_test_yoursecret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
MONGO_URI=mongodb://localhost:27017/examdb

FRONTEND: create .env in frontend root:
VITE_API_BASE=http://localhost:8000
VITE_RAZORPAY_KEY_ID=rzp_test_yourkeyid

2) Install

Backend (venv):

pip install -r requirements.txt

Frontend:

cd frontend
npm install

3) Run

Backend:

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Frontend (dev):

npm run dev

4) Razorpay Test Mode

Use Razorpay test key pair (starts with rzp_test_...). In test mode Razorpay provides test UPI/cards. Use sample card number 4111 1111 1111 1111 with any future expiry and CVV.

5) Sample API: Create order

POST /payments/create-order
Headers: Authorization: Bearer <token>
Body: { "amount": 299 }

Response:
{
  "order_id": "order_XXXX",
  "razorpay_key_id": "rzp_test_...",
  "amount": 299
}

6) Verify payment

After the checkout completes the client calls POST /payments/verify-payment with body:
{
  "order_id": "order_XXXX",
  "payment_id": "pay_YYYY",
  "signature": "signature_from_razorpay"
}

Server validates signature and activates premium.

7) Webhook

Configure webhook endpoint: POST https://yourserver.com/payments/webhook
Use the webhook secret in Razorpay dashboard. The service will verify signature and process events like payment.captured and payment.failed.

8) Notes & Security
- Never store RAZORPAY_KEY_SECRET in frontend.
- Validate signatures using HMAC-SHA256.
- Verify payment belongs to user and prevent duplicate processing by checking status==completed.

9) Testing UPI/cards
- Use test mode and provided test UPI IDs/cards in Razorpay docs.
- Cards: 4111 1111 1111 1111
- UPI: use UPI id test settings in dashboard or use "simulated" UPI flows in checkout during tests.

10) Sample responses and troubleshooting
- If signature mismatch: 403 Forbidden with message "Signature verification failed"
- If missing keys: service falls back to FREE_ order ids for zero-amount flows

