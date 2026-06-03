PayPro Global integration — quick setup

1) Add your PayPro credentials

- Copy `server/.env.example` -> `server/.env` and fill `MERCHANT_ID` and `PAYPRO_SECRET` (do NOT commit secrets).

2) Start the static site and local helper server

Static site (serves HTML/CSS/JS):

```
npm run static
```

Server (builds signed requests and receives IPN):

```
cd server
npm install
npm start
```

3) Test a payment flow

- Open `http://localhost:8080/bookings.html` and create a booking with a positive Amount to be Paid.
- After the booking is created, click the new **Pay Now** button in the success modal or the **Pay** button in the bookings table.
- The browser will post to `http://localhost:3000/create-payment`, and the helper server will redirect to the PayPro payment page.

4) Return/cancel pages

- `success.html` and `cancel.html` are included so PayPro can redirect users back after payment completion or cancellation.

5) Production

- Update `PAYPRO_URL` and `NOTIFY_URL` to the live endpoints provided by PayPro Global.
- Implement proper IPN signature verification in `server/index.js` following PayPro Global docs.
