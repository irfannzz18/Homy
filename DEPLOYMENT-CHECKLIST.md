# Production release checklist

- [ ] Provision managed PostgreSQL.
- [ ] Configure database backups and retention.
- [ ] Set a unique 32+ character JWT secret.
- [ ] Configure API CORS to the exact admin domain.
- [ ] Run Prisma migration deploy during release.
- [ ] Create admin credentials privately.
- [ ] Rotate the seed admin password.
- [ ] Add rate limiting.
- [ ] Add request logging and error monitoring.
- [ ] Perform a security review.
- [ ] Integrate a payment gateway with signed webhook verification.
- [ ] Implement provider refunds before offering online payment.
- [ ] Confirm cancellation/refund policy with the business owner.
- [ ] Configure delivery coverage and delivery charges.
- [ ] Configure taxes, inventory, support contact, privacy policy,
      and terms.
- [ ] Test Android on physical devices using the public API URL.
- [ ] Test registration and duplicate email handling.
- [ ] Test login and unauthorized API calls.
- [ ] Test product availability and checkout totals.
- [ ] Test order ownership and cancellation transitions.
- [ ] Test admin status transitions.
- [ ] Test network failure states.
- [ ] Configure EAS credentials.
- [ ] Generate signed APK/AAB.
- [ ] Validate accessibility and performance.
- [ ] Test database backup restoration.
- [ ] Configure production monitoring.
