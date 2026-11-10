import { useState } from 'react';
import { Send } from 'lucide-react';
import { BUSINESS } from '../content/business.js';
import { contactApi } from '../services/api.js';
import { toUserMessage } from '../services/httpClient.js';
import { useSeo } from '../hooks/useSeo.js';
import { useFormValidation } from '../hooks/useFormValidation.js';
import Field from '../components/Field.jsx';
import { block, email, line, phone } from '../utils/validation.js';

const TOPICS = ['Product enquiry', 'Order support', 'Private appointment', 'Other'];
const SPEC = { name: line('Name', { max: 100 }), email, phone: phone(true), message: block('Message', { min: 10, max: 2000 }) };
const EMPTY_MESSAGE = { name: '', email: '', phone: '', topic: TOPICS[0], message: '', website: '' }; // `website` is a bot trap

export default function ContactPage() {
  useSeo({ title: 'Contact us', description: 'Ask about a piece, an order or a private appointment.', path: '/contact' });
  const [form, setForm] = useState(EMPTY_MESSAGE);
  const [status, setStatus] = useState({ sent: false, error: '' });
  // Only details the owner has confirmed in src/content/business.js are shown; the form always works.
  const channels = [
    BUSINESS.email && ['Email', <a key="e" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>],
    BUSINESS.phone && ['Phone', <a key="p" href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a>],
    BUSINESS.whatsapp && ['WhatsApp', <a key="w" href={`https://wa.me/${BUSINESS.whatsapp}`}>Message on WhatsApp</a>],
    BUSINESS.address && ['Address', BUSINESS.address],
    BUSINESS.hours && ['Hours', BUSINESS.hours],
  ].filter(Boolean);
  const [isSending, setIsSending] = useState(false);
  const { errors, clear, blur, validate } = useFormValidation(SPEC);
  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSending) return;
    const { ok, values } = validate(form, event.currentTarget);
    if (!ok) return;
    setIsSending(true);
    try {
      await contactApi.send({ ...values, topic: form.topic, website: form.website });
      setForm(EMPTY_MESSAGE);
      setStatus({ sent: true, error: '' });
    } catch (caught) {
      setStatus({ sent: false, error: toUserMessage(caught) });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="wrap sec">
      <h1 className="pg">Contact us</h1>
      <p className="lede">Ask about a piece, an order or a private appointment. If it is about an order, include the order number.</p>
      <div className={`cgrid${channels.length ? '' : ' single'}`}>
        {channels.length > 0 && (
          <div className="cinfo">
            {channels.map(([title, content]) => <div key={title}><h2>{title}</h2><p>{content}</p></div>)}
          </div>
        )}
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="two">
            <Field name="name" required maxLength={100} autoComplete="name" label="Full name" value={form.name} error={errors.name} onChange={handleChange} onValueChange={clear} onValueBlur={blur} />
            <Field name="email" type="email" required maxLength={254} autoComplete="email" label="Email address" value={form.email} error={errors.email} onChange={handleChange} onValueChange={clear} onValueBlur={blur} />
          </div>
          <div className="two">
            <Field name="phone" type="tel" maxLength={20} autoComplete="tel" label="Phone (optional)" placeholder="+234 801 234 5678" value={form.phone} error={errors.phone} onChange={handleChange} onValueChange={clear} onValueBlur={blur} />
            <div className="fld"><label htmlFor="topic">Topic</label><select id="topic" className="f" name="topic" value={form.topic} onChange={handleChange}>{TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</select></div>
          </div>
          <div className="fld">
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" required maxLength={2000} placeholder="How can we help?" value={form.message}
              aria-invalid={errors.message ? 'true' : undefined} aria-describedby={errors.message ? 'message-error' : undefined} onChange={(event) => { handleChange(event); clear('message'); }} onBlur={(event) => blur('message', event.target.value)} />
            {errors.message && <p role="alert" id="message-error" className="field-error">{errors.message}</p>}
          </div>
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={handleChange} />
          <button className="cta" type="submit" disabled={isSending}><Send />{isSending ? 'Sending…' : 'Send message'}</button>
          {status.sent && <p role="status" className="note">Message sent. Thank you.</p>}
          {status.error && <p role="alert" className="field-error">{status.error}</p>}
        </form>
      </div>
    </div>
  );
}
