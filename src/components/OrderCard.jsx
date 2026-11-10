import { formatMoney } from '../utils/money.js';

export const ORDER_STEPS = ['Order confirmed', 'Packed', 'Shipped', 'Delivered'];

export function OrderTimeline({ step }) {
  return <ol className="tl">{ORDER_STEPS.map((label, index) => <li key={label} className={index <= step ? 'd' : ''}>{label}</li>)}</ol>;
}

export default function OrderCard({ order, isUpdated = false }) {
  const placed = new Date(order.placedAt).toLocaleDateString('en', { dateStyle: 'medium' });
  return (
    <article className="oc">
      <div className="row"><h3>{order.orderNumber}{isUpdated && <span className="upd">Updated</span>}</h3><strong>{formatMoney(order.total, order.currency)}</strong></div>
      <p className="note">{placed} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {ORDER_STEPS[order.step]}</p>
      <ul>
        {order.items.map((item) => (
          <li key={item.name}>{item.name} × {item.qty}{item.gift && <span className="gift"> + {item.gift} (free)</span>}</li>
        ))}
      </ul>
      <OrderTimeline step={order.step} />
      {order.carrier && <p className="note">{order.carrier} · {order.trackingNumber}</p>}
    </article>
  );
}
