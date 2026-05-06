import { useState } from 'react';
import { Navbar } from '../../components/layouts/navbar';
import { Footer } from '../../components/layouts/footer';
import { Mail, Phone, MapPin } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

function SkillGamesForm() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    state: '',
    zip: '',
    business: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const { firstName, lastName, phone, address, state, zip, business } = form;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !address.trim() || !state || !zip.trim() || !business.trim()) {
      setStatus({ type: 'error', message: 'Please fill out all fields.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c/skill-games-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          address: address.trim(),
          state,
          zip: zip.trim(),
          business: business.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: data.message || 'Message sent. We will get back to you shortly.' });
        setForm({ firstName: '', lastName: '', phone: '', address: '', state: '', zip: '', business: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send. Try again later.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 sm:px-5 py-3.5 sm:py-4 text-base border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 transition-all";
  const labelClass = "block text-sm sm:text-base text-black/70 mb-2 sm:mb-2.5 font-medium";

  return (
    <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
      {status && (
        <div className={`p-3 sm:p-4 rounded-xl text-sm sm:text-base ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {status.message}
        </div>
      )}

      {/* Full Name: First + Last */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First Name</label>
          <input
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            type="text"
            className={inputClass}
            placeholder="First"
          />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            type="text"
            className={inputClass}
            placeholder="Last"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass}>Phone #</label>
        <input
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          type="tel"
          className={inputClass}
          placeholder="(000) 000-0000"
        />
      </div>

      {/* Full Address */}
      <div>
        <label className={labelClass}>Full Address</label>
        <input
          value={form.address}
          onChange={e => set('address', e.target.value)}
          type="text"
          className={inputClass}
          placeholder="123 Main St, City"
        />
      </div>

      {/* State + Zip */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>State</label>
          <select
            value={form.state}
            onChange={e => set('state', e.target.value)}
            className={`${inputClass} bg-white`}
          >
            <option value="">Select state</option>
            {US_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Zip Code</label>
          <input
            value={form.zip}
            onChange={e => set('zip', e.target.value)}
            type="text"
            maxLength={10}
            className={inputClass}
            placeholder="00000"
          />
        </div>
      </div>

      {/* Business */}
      <div>
        <label className={labelClass}>What business do you own?</label>
        <input
          value={form.business}
          onChange={e => set('business', e.target.value)}
          type="text"
          className={inputClass}
          placeholder="Describe your business"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 sm:px-8 py-4 text-base bg-black text-white rounded-full transition-all hover:bg-black/90 active:scale-95 disabled:opacity-60 font-medium shadow-lg shadow-black/10"
      >
        {loading ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}

export function SkillGamesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-12 sm:pt-14">
        <section className="pt-12 sm:pt-14 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl text-black mb-4 sm:mb-5">
                Skill Games
              </h2>
              <p className="text-base text-black/60 max-w-2xl mx-auto px-4 sm:px-0">
                Ready to start your project? Have questions about our services? We'd love to hear from you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 px-4 sm:px-0">
              {/* Form */}
              <div className="bg-white border border-black/5 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg">
                <h3 className="text-lg sm:text-xl text-black mb-4 sm:mb-6">
                  Send Us A Message
                </h3>
                <SkillGamesForm />
              </div>

              {/* Contact Info */}
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-lg sm:text-xl text-black mb-4 sm:mb-6">
                    Contact Information
                  </h3>
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/5 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-black/70" />
                      </div>
                      <div>
                        <p className="text-base text-black mb-1">Email</p>
                        <a href="mailto:info@e8productions.com" className="text-sm text-black/60 hover:text-black transition-colors break-all">
                          info@e8productions.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/5 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-black/70" />
                      </div>
                      <div>
                        <p className="text-base text-black mb-1">Phone</p>
                        <a href="tel:+18088590875" className="text-sm text-black/60 hover:text-black transition-colors">
                          (808) 859-0875
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/5 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-black/70" />
                      </div>
                      <div>
                        <p className="text-base text-black mb-1">Location</p>
                        <p className="text-sm text-black/60">
                          Remote-first team<br />
                          Serving clients globally
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-xl">
                  <h4 className="text-base sm:text-lg mb-2 sm:mb-3">
                    Quick Response
                  </h4>
                  <p className="text-base text-white/70">
                    We typically respond to all inquiries within 24 hours during business days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}