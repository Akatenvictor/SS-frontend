/**
 * Invoice display defaults.
 *
 * The minimum investment floor is a protocol-wide setting read from
 * `GET /protocol/status` (issue #116) and can change independently of any
 * one invoice. This value is only used while that request is in flight or has
 * failed, so the invest CTA still renders instead of blocking the page.
 */
export const DEFAULT_MIN_INVESTMENT = 1;
