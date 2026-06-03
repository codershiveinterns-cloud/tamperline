PayPro Global integration - quick setup

1) Add your PayPro product IDs

- Copy `server/.env.example` -> `server/.env`.
- Fill the PayPro product IDs for each plan/billing option:
  - `PAYPRO_PRODUCT_TAP_MONTHLY`
  - `PAYPRO_PRODUCT_TAP_ANNUAL`
  - `PAYPRO_PRODUCT_BARREL_MONTHLY`
  - `PAYPRO_PRODUCT_BARREL_ANNUAL`
  - `PAYPRO_PRODUCT_CELLAR_MONTHLY`
  - `PAYPRO_PRODUCT_CELLAR_ANNUAL`
- For booking balance payments, fill `PAYPRO_PRODUCT_BOOKING`.
- Keep `PAYPRO_CHECKOUT_URL=https://store.payproglobal.com/checkout` for live checkout.

2) Start the local server

```
npm install
npm start
```

3) Test a payment flow

- Open `http://localhost:3000/dashboard.html`.
- Choose a plan in the upgrade modal.
- The browser posts to `/create-payment`, and the server redirects to PayPro Global checkout.

4) Return/cancel pages

- `success.html` and `cancel.html` are included so PayPro can redirect users back after payment completion or cancellation.
- Configure those redirects in the PayPro Global product/page settings.

5) Production

- Add the same PayPro product ID environment variables in Vercel.
- The live `/create-payment` path is rewritten to `/api/create-payment` by `vercel.json`.
- Set the PayPro IPN/webhook URL to `https://your-domain.example/ipn`.
- Implement proper IPN signature verification before using webhook events to activate accounts automatically.
