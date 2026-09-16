import { notFound } from 'next/navigation';
import { getOrderById } from '@/lib/orders/engine';
import { formatINR } from '@/lib/money';
import { PrintInvoiceButton } from './PrintInvoiceButton';
import Image from 'next/image';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const order = await getOrderById(id);
  return {
    title: order ? `Invoice #${order.orderNumber} | ${order.shop.name}` : 'Invoice',
  };
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const { shop, customer, items } = order;

  const subtotalPaise = order.metalPaise + order.makingPaise + order.stonePaise;
  const cgstPaise = Math.round(order.gstPaise / 2);
  const sgstPaise = order.gstPaise - cgstPaise;

  const fullAddress = [shop.addressLine1, shop.addressLine2, `${shop.city}, ${shop.state} - ${shop.pincode}`]
    .filter(Boolean)
    .join(', ');

  const customerFullAddress = [customer.addressLine1, customer.addressLine2, customer.city, customer.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-surface-sunk py-8 px-4 flex flex-col items-center print:bg-white print:p-0">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 print:hidden">
        <a
          href="/admin/orders"
          className="text-sm font-medium text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
        >
          ← Back to Orders
        </a>
        <PrintInvoiceButton />
      </div>

      {/* A4 Printable Sheet Container */}
      <div className="w-[210mm] min-h-[297mm] bg-white text-ink p-8 shadow-2xl rounded-card print:shadow-none print:w-full print:min-h-0 print:p-6 print:rounded-none relative flex flex-col justify-between border-4 border-double border-brand">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex justify-between items-start border-b border-line pb-6">
            <div className="space-y-2 max-w-md">
              {shop.logoPath ? (
                <div className="h-12 w-48 relative mb-2">
                  <Image
                    src={shop.logoPath}
                    alt={shop.name}
                    fill
                    className="object-contain object-left"
                  />
                </div>
              ) : (
                <h1 className="font-display text-3xl font-bold tracking-tight text-brand">
                  {shop.name}
                </h1>
              )}
              {shop.tagline && <p className="text-xs text-ink-muted font-medium italic">{shop.tagline}</p>}
              <p className="text-xs text-ink-muted leading-relaxed">
                {fullAddress}
                <br />
                Phone: <span className="numeric">{shop.phone}</span> | Email: {shop.email}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-brand-soft text-brand text-xs font-bold uppercase tracking-widest rounded-field">
                Tax Invoice / Bill
              </span>
              <h2 className="font-display text-2xl font-bold text-ink numeric mt-2">
                #{order.orderNumber}
              </h2>
              <p className="text-xs text-ink-muted">
                Date:{' '}
                <span className="numeric font-medium">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </p>
              {order.requiredByDate && (
                <p className="text-xs text-brand font-medium">
                  Event Date:{' '}
                  <span className="numeric">
                    {new Date(order.requiredByDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Customer & Bill Details */}
          <div className="grid grid-cols-2 gap-6 bg-surface-sunk p-4 rounded-field border border-line text-xs">
            <div>
              <span className="font-bold text-ink uppercase tracking-wider block mb-1">
                Billed To (Customer):
              </span>
              <p className="font-semibold text-sm text-ink">{customer.name}</p>
              <p className="text-ink-muted">
                Mobile: <span className="numeric">{customer.phone}</span>
              </p>
              {customerFullAddress && <p className="text-ink-muted mt-1">{customerFullAddress}</p>}
            </div>

            <div className="text-right space-y-1">
              <span className="font-bold text-ink uppercase tracking-wider block mb-1">
                Shop Tax & Registration:
              </span>
              <p className="text-ink-muted">
                HSN Category: <span className="numeric font-semibold text-ink">7113</span> (Jewellery)
              </p>
              <p className="text-ink-muted">
                GST State: <span className="font-semibold text-ink">{shop.state}</span>
              </p>
              <p className="text-ink-muted">
                Status: <span className="font-bold text-brand uppercase">{order.status}</span>
              </p>
            </div>
          </div>

          {/* Itemized Pricing Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-line">
              <thead>
                <tr className="bg-surface text-ink font-bold border-b border-line">
                  <th className="p-2.5 border-r border-line">#</th>
                  <th className="p-2.5 border-r border-line">Item Description</th>
                  <th className="p-2.5 border-r border-line text-center">HSN</th>
                  <th className="p-2.5 border-r border-line text-right">Net Wt (g)</th>
                  <th className="p-2.5 border-r border-line text-right">Rate (Rs/g)</th>
                  <th className="p-2.5 border-r border-line text-right">Making Charges</th>
                  <th className="p-2.5 border-r border-line text-right">Stone (Rs)</th>
                  <th className="p-2.5 text-right">Total (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemMetalPaise = Math.round(item.weightGrams * item.metalRatePaise);
                  const makingAmountPaise = Math.round((itemMetalPaise * item.makingPercentBp) / 10000);
                  const firstImg = item.product?.images?.[0];
                  const imgSrc = firstImg
                    ? (firstImg.basePath.startsWith('/') || firstImg.basePath.startsWith('http')
                        ? firstImg.basePath
                        : `/uploads/${firstImg.basePath}-400.webp`)
                    : null;

                  return (
                    <tr key={item.id} className="border-b border-line">
                      <td className="p-2.5 border-r border-line numeric">{idx + 1}</td>
                      <td className="p-2.5 border-r border-line font-medium text-ink">
                        <div className="flex items-center gap-3">
                          {imgSrc && (
                            <div className="w-10 h-10 relative flex-shrink-0 rounded-field overflow-hidden border border-line bg-surface-sunk">
                              <Image
                                src={imgSrc}
                                alt={item.productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <span>{item.productName}</span>
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-line text-center numeric">7113</td>
                      <td className="p-2.5 border-r border-line text-right numeric font-medium">
                        {item.weightGrams}g
                      </td>
                      <td className="p-2.5 border-r border-line text-right numeric">
                        {formatINR(item.metalRatePaise)}
                      </td>
                      <td className="p-2.5 border-r border-line text-right numeric">
                        {(item.makingPercentBp / 100).toFixed(1)}% ({formatINR(makingAmountPaise)})
                      </td>
                      <td className="p-2.5 border-r border-line text-right numeric">
                        {formatINR(item.stoneValuePaise)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-ink numeric">
                        {formatINR(item.pricePaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-xs border border-line p-4 rounded-field bg-surface-sunk">
              <div className="flex justify-between text-ink-muted">
                <span>Metal Amount:</span>
                <span className="numeric">{formatINR(order.metalPaise)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Making Charges:</span>
                <span className="numeric">{formatINR(order.makingPaise)}</span>
              </div>
              {order.stonePaise > 0 && (
                <div className="flex justify-between text-ink-muted">
                  <span>Stone / Diamond Value:</span>
                  <span className="numeric">{formatINR(order.stonePaise)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-ink border-t border-line pt-1">
                <span>Subtotal:</span>
                <span className="numeric">{formatINR(subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-ink-muted text-[11px]">
                <span>CGST (1.5%):</span>
                <span className="numeric">{formatINR(cgstPaise)}</span>
              </div>
              <div className="flex justify-between text-ink-muted text-[11px]">
                <span>SGST (1.5%):</span>
                <span className="numeric">{formatINR(sgstPaise)}</span>
              </div>
              {order.roundingPaise !== 0 && (
                <div className="flex justify-between text-ink-faint text-[11px]">
                  <span>Rounding Adjustment:</span>
                  <span className="numeric">{formatINR(order.roundingPaise)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-ink border-t-2 border-brand pt-2">
                <span>Grand Total:</span>
                <span className="numeric text-brand">{formatINR(order.totalPaise)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Signature Section */}
        <div className="border-t border-line pt-6 mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-8 text-[11px] text-ink-muted">
            <div className="space-y-1">
              <span className="font-bold text-ink uppercase tracking-wider block">Terms & Conditions:</span>
              <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
                <li>Goods once sold will be exchanged or repurchased per shop terms.</li>
                <li>Weight measured on certified electronic scale at room temp.</li>
                <li>Subject to local jurisdiction ({shop.city}).</li>
              </ol>
            </div>

            <div className="text-right flex flex-col justify-between items-end">
              <div>
                <span className="font-bold text-ink block">For {shop.name}</span>
                <p className="text-[10px] text-ink-faint mt-0.5">Authorized Signatory</p>
              </div>
              <div className="w-40 h-14 border border-dashed border-line rounded-field mt-6 flex items-center justify-center text-[10px] text-ink-faint">
                Stamp / Signature Box
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-ink-faint border-t border-line pt-3">
            Thank you for shopping with {shop.name}! Visit again.
          </div>
        </div>
      </div>
    </div>
  );
}
