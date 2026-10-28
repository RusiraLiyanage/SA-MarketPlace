-- SA Marketplace schema verification (DATABASE.md §11). Every row of the final table must read PASS.
-- Run: pnpm db:verify (needs migrations applied and the seed loaded).

\pset pager off

\echo '======================================================================'
\echo ' TABLES'
\echo '======================================================================'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name <> 'migrations'
ORDER BY table_name;

\echo ''
\echo '======================================================================'
\echo ' ENUM TYPES AND THEIR VALUES'
\echo '======================================================================'
SELECT t.typname AS enum_type,
       string_agg(e.enumlabel, ' | ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

\echo ''
\echo '======================================================================'
\echo ' UNIQUE CONSTRAINTS'
\echo '======================================================================'
SELECT conrelid::regclass::text AS table_name, conname AS constraint_name,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'u' AND connamespace = 'public'::regnamespace
ORDER BY 1, 2;

\echo ''
\echo '======================================================================'
\echo ' CHECK CONSTRAINTS (excluding NOT NULL)'
\echo '======================================================================'
SELECT conrelid::regclass::text AS table_name, conname AS constraint_name,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY 1, 2;

\echo ''
\echo '======================================================================'
\echo ' INDEXES'
\echo '======================================================================'
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo ''
\echo '======================================================================'
\echo ' FOREIGN KEY COLUMNS WITH NO LEADING INDEX  (must be empty)'
\echo '======================================================================'
SELECT c.conrelid::regclass::text AS table_name, a.attname AS column_name
FROM pg_constraint c
JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON k.ord = 1
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE c.contype = 'f'
  AND c.connamespace = 'public'::regnamespace
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND i.indkey[0] = k.attnum
  );

\echo ''
\echo '======================================================================'
\echo ' PRICE FREEZING  (mutates inside a transaction, then rolls back)'
\echo '======================================================================'
BEGIN;
UPDATE product SET price = price + 10.00 WHERE sku = 'UCK-001';
SELECT oi.sku,
       oi.unit_price_at_purchase AS frozen_on_order,
       p.price                   AS live_price_now,
       i.total                   AS invoice_total
FROM order_item oi
JOIN product p     ON p.id = oi.product_id
JOIN "order" o     ON o.id = oi.order_id
LEFT JOIN invoice i ON i.order_id = o.id
WHERE oi.sku = 'UCK-001';
ROLLBACK;

\echo ''
\echo '======================================================================'
\echo ' ASSERTIONS  (every row must read PASS)'
\echo '======================================================================'
WITH checks AS (
  SELECT 'schema: 17 tables exist' AS assertion,
         (SELECT count(*) FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name <> 'migrations') = 17 AS ok
  UNION ALL
  SELECT 'schema: 7 enum types exist',
         (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typtype = 'e' AND n.nspname = 'public') = 7
  UNION ALL
  SELECT 'schema: every FK column has a leading index',
         NOT EXISTS (
           SELECT 1 FROM pg_constraint c
           JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON k.ord = 1
           WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
             AND NOT EXISTS (SELECT 1 FROM pg_index i
                             WHERE i.indrelid = c.conrelid AND i.indkey[0] = k.attnum))
  UNION ALL
  -- Bump this with every new migration; a mismatch means the database is behind.
  SELECT 'schema: all migrations applied',
         (SELECT count(*) FROM migrations) = 20
  UNION ALL
  -- PCI: card_last4 and card_brand are the only permitted card-ish columns.
  SELECT 'pci: no card number, cvc or expiry column anywhere',
         NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND column_name ~* 'card|cvc|cvv|expiry|expiration'
             AND column_name NOT IN ('card_last4', 'card_brand'))
  UNION ALL
  SELECT 'identity: Jordan Shaw is exactly one user row',
         (SELECT count(*) FROM "user" WHERE email = 'j.shaw@saclinics.com.au') = 1
  UNION ALL
  SELECT 'identity: Jordan Shaw holds exactly two roles',
         (SELECT count(*) FROM user_role r JOIN "user" u ON u.id = r.user_id
          WHERE u.email = 'j.shaw@saclinics.com.au') = 2
  UNION ALL
  SELECT 'catalogue: draft product is not buyer-visible',
         NOT EXISTS (
           SELECT 1 FROM product p JOIN supplier_profile sp ON sp.id = p.supplier_profile_id
           WHERE p.sku = 'BSB-008' AND p.listing_status = 'published' AND sp.status = 'approved')
  UNION ALL
  SELECT 'catalogue: product of an unapproved supplier is not buyer-visible',
         NOT EXISTS (
           SELECT 1 FROM product p JOIN supplier_profile sp ON sp.id = p.supplier_profile_id
           WHERE p.sku = 'SSP-009' AND p.listing_status = 'published' AND sp.status = 'approved')
  UNION ALL
  SELECT 'catalogue: unapproved suppliers own at least one published product',
         EXISTS (
           SELECT 1 FROM product p JOIN supplier_profile sp ON sp.id = p.supplier_profile_id
           WHERE p.listing_status = 'published' AND sp.status <> 'approved')
  UNION ALL
  SELECT 'ordering: order_item price is frozen, not the live product price',
         (SELECT oi.unit_price_at_purchase FROM order_item oi WHERE oi.sku = 'UCK-001') = 24.99
  UNION ALL
  SELECT 'ordering: every order line belongs to its order supplier',
         NOT EXISTS (
           SELECT 1 FROM order_item oi
           JOIN "order" o  ON o.id = oi.order_id
           JOIN product p  ON p.id = oi.product_id
           WHERE p.supplier_profile_id <> o.supplier_profile_id)
  UNION ALL
  SELECT 'billing: invoices exist only for dispatched or delivered orders',
         NOT EXISTS (
           SELECT 1 FROM invoice i JOIN "order" o ON o.id = i.order_id
           WHERE o.status NOT IN ('dispatched', 'delivered'))
  UNION ALL
  SELECT 'billing: order totals equal subtotal plus gst',
         NOT EXISTS (SELECT 1 FROM "order" WHERE round(subtotal + gst_total, 2) <> total)
  UNION ALL
  SELECT 'billing: order totals equal the sum of their lines',
         NOT EXISTS (
           SELECT 1 FROM "order" o
           JOIN (SELECT order_id, sum(line_total) AS lines FROM order_item GROUP BY order_id) s
             ON s.order_id = o.id
           WHERE round(s.lines, 2) <> o.total)
  UNION ALL
  SELECT 'inventory: shelf stock is tracked separately from supplier stock',
         EXISTS (SELECT 1 FROM inventory WHERE quantity_on_hand > 0)
  UNION ALL
  -- Plain UNIQUE is only case-insensitive because ck_user_email_lowercase forces lowercase.
  SELECT 'identity: every email is stored lowercase',
         NOT EXISTS (SELECT 1 FROM "user" WHERE email <> lower(email))
  UNION ALL
  SELECT 'identity: the lowercase email constraint exists',
         EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'ck_user_email_lowercase' AND contype = 'c')
  UNION ALL
  -- ABN checksum: subtract 1 from the first digit, weight the digits by
  -- 10,1,3,5,7,9,11,13,15,17,19, and the sum must be divisible by 89.
  SELECT 'identity: approved suppliers have a checksum-valid ABN',
         NOT EXISTS (
           SELECT 1 FROM supplier_profile sp
           WHERE sp.status = 'approved'
             AND (SELECT sum((substr(sp.abn, i::int, 1)::int
                              - CASE WHEN i = 1 THEN 1 ELSE 0 END) * w)
                  FROM unnest(ARRAY[10,1,3,5,7,9,11,13,15,17,19])
                       WITH ORDINALITY AS t(w, i)) % 89 <> 0)
  UNION ALL
  -- A supplier has been reviewed exactly when it is no longer pending, and only an
  -- approved one can have acknowledged the approval notice.
  SELECT 'identity: reviewed_at is set exactly for decided suppliers',
         NOT EXISTS (
           SELECT 1 FROM supplier_profile
           WHERE (status = 'pending_review') <> (reviewed_at IS NULL))
  UNION ALL
  SELECT 'identity: only approved suppliers have acknowledged the approval',
         NOT EXISTS (
           SELECT 1 FROM supplier_profile
           WHERE approval_acknowledged_at IS NOT NULL AND status <> 'approved')
  UNION ALL
  -- ADR 0033: every date-time is a UTC instant. A date or timestamp-without-zone
  -- column would reintroduce "whose calendar?".
  SELECT 'schema: every date/time column is timestamptz',
         NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND data_type IN ('date', 'timestamp without time zone',
                               'time without time zone', 'time with time zone'))
  UNION ALL
  SELECT 'catalogue: every product has exactly one primary image',
         NOT EXISTS (
           SELECT 1 FROM product p
           WHERE (SELECT count(*) FROM product_image i
                  WHERE i.product_id = p.id AND i.is_primary) <> 1)
  UNION ALL
  -- Coverage: every value of every enum must appear somewhere, or a state of the
  -- system has no data behind it and cannot be demoed or tested.
  SELECT 'coverage: every enum value appears in the data',
         NOT EXISTS (
           WITH defined AS (
             SELECT t.typname AS et, e.enumlabel AS v
             FROM pg_type t
             JOIN pg_enum e ON e.enumtypid = t.oid
             JOIN pg_namespace n ON n.oid = t.typnamespace
             WHERE n.nspname = 'public'
           ), used AS (
             SELECT 'user_status' et, status::text v FROM "user"
             UNION ALL SELECT 'user_role_type', role::text FROM user_role
             UNION ALL SELECT 'supplier_status', status::text FROM supplier_profile
             UNION ALL SELECT 'listing_status', listing_status::text FROM product
             UNION ALL SELECT 'order_status', status::text FROM "order"
             UNION ALL SELECT 'payment_method', method::text FROM payment
             UNION ALL SELECT 'payment_status', status::text FROM payment
           )
           SELECT 1 FROM defined d
           WHERE NOT EXISTS (SELECT 1 FROM used u WHERE u.et = d.et AND u.v = d.v))
  UNION ALL
  SELECT 'coverage: the self-referencing category tree has sub-categories',
         EXISTS (SELECT 1 FROM category WHERE parent_id IS NOT NULL)
  UNION ALL
  SELECT 'coverage: every carrier is used by a delivery',
         NOT EXISTS (SELECT 1 FROM carrier c
                     WHERE NOT EXISTS (SELECT 1 FROM delivery d WHERE d.carrier_id = c.id))
  UNION ALL
  -- The shipping address is captured at checkout, so an order without a delivery row
  -- has nowhere to ship.
  SELECT 'fulfilment: every order has a delivery',
         NOT EXISTS (SELECT 1 FROM "order" o
                     WHERE NOT EXISTS (SELECT 1 FROM delivery d WHERE d.order_id = o.id))
  UNION ALL
  SELECT 'fulfilment: delivered orders have a delivered_at',
         NOT EXISTS (SELECT 1 FROM "order" o JOIN delivery d ON d.order_id = o.id
                     WHERE o.status = 'delivered' AND d.delivered_at IS NULL)
  UNION ALL
  SELECT 'fulfilment: dispatched orders have a carrier and tracking number',
         NOT EXISTS (SELECT 1 FROM "order" o JOIN delivery d ON d.order_id = o.id
                     WHERE o.status = 'dispatched'
                       AND (d.carrier_id IS NULL OR d.tracking_number IS NULL))
  UNION ALL
  SELECT 'ordering: cancelled orders carry a reason and no invoice',
         NOT EXISTS (SELECT 1 FROM "order" o WHERE o.status = 'cancelled'
                     AND (o.cancellation_reason IS NULL
                          OR EXISTS (SELECT 1 FROM invoice i WHERE i.order_id = o.id)))
  UNION ALL
  -- Cancelling refunds a paid order, so none may stay 'paid'.
  SELECT 'ordering: a cancelled order is never left with a paid payment',
         NOT EXISTS (SELECT 1 FROM "order" o JOIN payment p ON p.order_id = o.id
                     WHERE o.status = 'cancelled' AND p.status = 'paid')
  UNION ALL
  SELECT 'inventory: a delivered order is reflected in the buyer org shelf stock',
         EXISTS (SELECT 1 FROM inventory i
                 JOIN organisation org ON org.id = i.organisation_id
                 WHERE org.name = 'WorkSafe Pty Ltd' AND i.quantity_on_hand > 0)
  UNION ALL
  SELECT 'ordering: the demo cart is populated and carries no prices',
         (SELECT count(*) FROM cart_item) > 0
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'cart_item' AND column_name LIKE '%price%')
)
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, assertion
FROM checks
ORDER BY ok, assertion;

\echo ''
\echo '======================================================================'
\echo ' SUMMARY'
\echo '======================================================================'
