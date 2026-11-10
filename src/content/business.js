// Facts only the business owner can confirm. A field left as null is simply not shown anywhere on the site,
// so no placeholder or invented claim ever reaches a customer. Fill these in when they are true.

export const BUSINESS = {
  name: 'Aurora',
  descriptor: 'Fine Jewelry',
  email: null,      // e.g. 'hello@yourdomain.com'
  phone: null,      // e.g. '+234 801 234 5678'  (shown as a tel: link)
  whatsapp: null,   // digits only with country code, e.g. '2348012345678'
  address: null,    // e.g. 'Shop 4, Example Plaza, Ibadan'
  hours: null,      // e.g. 'Monday to Saturday, 9:00 to 18:00 WAT'
};

// Delivery time estimates shown at checkout, e.g. '3 to 5 days'. Left null, no time is promised.
export const DELIVERY = { standard: null, express: null };

// Promises and policies. Each needs the owner's wording and the owner's confirmation that it is true.
// Left null, nothing is shown. When set, product pages and the footer show them.
export const POLICIES = {
  returns: null,        // e.g. 'Unworn pieces can be returned within 14 days for a refund.'
  authenticity: null,   // e.g. what you can truthfully say about materials, hallmarks or certificates
  insurance: null,      // e.g. whether parcels are insured in transit, and up to what value
  warranty: null,       // e.g. a warranty on watches, with its length and what it covers
};
