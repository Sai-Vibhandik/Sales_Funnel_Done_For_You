import { useState } from 'react';
import { Download, ExternalLink, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/services/billingService';

/**
 * Payment History Component
 *
 * Displays a list of past invoices with download links.
 */
export function PaymentHistory({
  invoices = [],
  isLoading = false,
  showAll = false
}) {
  const [expanded, setExpanded] = useState(false);

  const displayInvoices = showAll || expanded ? invoices : invoices.slice(0, 5);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-700',
      open: 'bg-yellow-100 text-yellow-700',
      draft: 'bg-gray-100 text-gray-700',
      void: 'bg-gray-100 text-gray-500',
      uncollectible: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-48 rounded bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No payment history yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Your invoices will appear here after your first payment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
        <div>Invoice</div>
        <div>Amount</div>
        <div>Date</div>
        <div>Status</div>
        <div className="text-right">Actions</div>
      </div>

      {/* Invoice Rows */}
      <div className="divide-y divide-gray-100">
        {displayInvoices.map((invoice, index) => (
          <div
            key={invoice.id || invoice._id || index}
            className="grid grid-cols-2 sm:grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            {/* Invoice Number */}
            <div className="col-span-1">
              <div className="text-sm font-medium text-gray-900">
                #{invoice.number || invoice.invoiceNumber || 'N/A'}
              </div>
              <div className="sm:hidden text-xs text-gray-500 mt-1">
                {formatDate(invoice.paidAt || invoice.createdAt)}
              </div>
            </div>

            {/* Amount */}
            <div className="text-sm text-gray-900">
              {formatCurrency(invoice.amount, invoice.currency || 'USD')}
            </div>

            {/* Date */}
            <div className="hidden sm:block text-sm text-gray-500">
              {formatDate(invoice.paidAt || invoice.createdAt)}
            </div>

            {/* Status */}
            <div>
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                getStatusBadge(invoice.status)
              )}>
                {invoice.status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              {invoice.invoiceUrl && (
                <a
                  href={invoice.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                  title="View Invoice"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {invoice.invoicePdf && (
                <a
                  href={invoice.invoicePdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {!showAll && invoices.length > 5 && (
        <div className="border-t border-gray-200 px-6 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show All ({invoices.length - 5} more)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default PaymentHistory;