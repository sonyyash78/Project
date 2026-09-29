import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFileInvoice } from 'react-icons/fa';
import { invoiceService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { AmbientPage, GlassPanel, PageHeader } from '../components/enterprise/Ui';

export default function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    invoiceService.list().then((d) => setInvoices(d.invoices || [])).catch(() => {});
  }, [user, navigate]);

  const viewInvoice = async (id) => {
    const inv = await invoiceService.getById(id);
    setSelected(inv);
  };

  return (
    <AmbientPage>
      <PageHeader eyebrow="Billing" title="Invoices" description="GST-ready invoices for all your payments." />

      <GlassPanel className="invoice-table rounded-[28px] p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[var(--text-muted)]">
                <th className="px-3 py-3">Invoice #</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-white/6">
                  <td className="px-3 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-3 py-3">{inv.plan_name || '—'}</td>
                  <td className="px-3 py-3">₹{inv.total.toFixed(2)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${inv.status === 'paid' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-muted)]">{inv.created_at?.split('T')[0]}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => viewInvoice(inv.id)} className="text-indigo-300 hover:text-indigo-200"><FaFileInvoice /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices.length && <p className="py-8 text-center text-sm text-[var(--text-muted)]">No invoices yet.</p>}
        </div>
      </GlassPanel>

      {selected && (
        <GlassPanel className="mt-6 rounded-[28px] p-6">
          <h3 className="text-lg font-bold">{selected.invoice_number}</h3>
          <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{selected.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-₹{selected.discount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>GST ({selected.gst_rate}%)</span><span>₹{selected.gst_amount.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-white/8 pt-2 font-bold text-[var(--text-primary)]"><span>Total</span><span>₹{selected.total.toFixed(2)}</span></div>
          </div>
          <button onClick={() => setSelected(null)} className="btn-secondary mt-4">Close</button>
        </GlassPanel>
      )}
    </AmbientPage>
  );
}
