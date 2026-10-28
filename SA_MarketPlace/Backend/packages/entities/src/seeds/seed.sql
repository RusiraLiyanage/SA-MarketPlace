-- SA Marketplace seed data (DATABASE.md §10). All fictional (CLAUDE.md §7).
-- Idempotent: clears the seeded tables first, so it REPLACES them (hand-added rows are removed).
-- No ids written (gen_random_uuid()); FKs resolve by natural key so an ambiguous lookup fails loudly.

-- ---------------------------------------------------------------------------
-- Clear the seeded set (CASCADE covers dependents); "migrations" is untouched.
-- ---------------------------------------------------------------------------
TRUNCATE TABLE
  "organisation", "user", "user_role", "supplier_profile",
  "category", "product", "product_image", "carrier",
  "cart", "cart_item",
  "order", "order_item", "invoice", "payment", "delivery", "inventory"
CASCADE;

-- ---------------------------------------------------------------------------
-- Organisations
-- ---------------------------------------------------------------------------
INSERT INTO "organisation" ("name", "billing_address") VALUES
  ('SA Clinics Pty Ltd', '12 Wellness Way, Parramatta NSW 2150'),
  ('WorkSafe Pty Ltd',   '88 Industrial Drive, Dandenong VIC 3175'),
  ('Mining Co Pty Ltd',  '5 Ore Road, Kalgoorlie WA 6430'),
  ('Transport Ltd',      '210 Freight Street, Laverton VIC 3028'),
  ('Safety Corp',        '3 Compliance Court, Macquarie Park NSW 2113');

-- ---------------------------------------------------------------------------
-- Users
-- Shared dev password Password123! (12 chars, hence password_length); the hash is a fixture, not a secret.
-- ---------------------------------------------------------------------------
INSERT INTO "user" ("organisation_id", "email", "password_hash", "password_length", "first_name", "last_name", "phone") VALUES
  -- Jordan holds TWO roles: proof of the shared-account requirement.
  ((SELECT id FROM "organisation" WHERE name = 'SA Clinics Pty Ltd'), 'j.shaw@saclinics.com.au',         '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Jordan', 'Shaw',    '0412 000 001'),
  (NULL,                                                              'priya@bindimedsupply.com.au',     '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Priya',  'Nair',    '0412 000 002'),
  (NULL,                                                              'a.morgan@sampleassist.com.au',    '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Alex',   'Morgan',  '0412 000 003'),
  ((SELECT id FROM "organisation" WHERE name = 'Mining Co Pty Ltd'),  's.chen@miningco.com.au',          '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Sarah',  'Chen',    '0412 000 004'),
  -- Extra users: supplier_profile.user_id is UNIQUE and each ordering organisation needs a buyer.
  ((SELECT id FROM "organisation" WHERE name = 'WorkSafe Pty Ltd'),   't.beckett@worksafe.com.au',       '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Tom',    'Beckett', '0412 000 005'),
  ((SELECT id FROM "organisation" WHERE name = 'Safety Corp'),        'n.alvarez@safetycorp.com.au',     '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Nina',   'Alvarez', '0412 000 006'),
  ((SELECT id FROM "organisation" WHERE name = 'Transport Ltd'),      'o.fraser@transportltd.com.au',    '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Owen',   'Fraser',  '0412 000 007'),
  (NULL,                                                              'm.webb@safetyfirstdist.com.au',   '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Marcus', 'Webb',    '0412 000 008'),
  (NULL,                                                              'd.liu@cheaptestkits.com.au',      '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Dana',   'Liu',     '0412 000 009'),
  (NULL,                                                              'r.patel@clinicalsupplies.com.au', '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Ravi',   'Patel',   '0412 000 010');

-- Non-active accounts, so the suspended and pending states have data behind them.
INSERT INTO "user" ("organisation_id", "email", "password_hash", "password_length", "first_name", "last_name", "phone", "status") VALUES
  ((SELECT id FROM "organisation" WHERE name = 'WorkSafe Pty Ltd'), 'k.doyle@worksafe.com.au',    '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Karen', 'Doyle', '0412 000 011', 'suspended'),
  ((SELECT id FROM "organisation" WHERE name = 'Transport Ltd'),    'l.tran@transportltd.com.au', '$2b$10$wlD1MUT7J5b28sT.Trk6de/4CNXAfa4fsUxAO6eg9aSUVqa/VhSbe', 12, 'Leo',   'Tran',  '0412 000 012', 'pending');

INSERT INTO "user_role" ("user_id", "role")
SELECT u.id, v.role::user_role_type
FROM (VALUES
  ('j.shaw@saclinics.com.au',         'buyer'),
  ('j.shaw@saclinics.com.au',         'collection_manager'),
  ('priya@bindimedsupply.com.au',     'seller'),
  ('a.morgan@sampleassist.com.au',    'admin'),
  ('s.chen@miningco.com.au',          'buyer'),
  ('t.beckett@worksafe.com.au',       'buyer'),
  ('n.alvarez@safetycorp.com.au',     'buyer'),
  ('o.fraser@transportltd.com.au',    'buyer'),
  ('m.webb@safetyfirstdist.com.au',   'seller'),
  ('d.liu@cheaptestkits.com.au',      'seller'),
  ('r.patel@clinicalsupplies.com.au', 'seller'),
  ('k.doyle@worksafe.com.au',         'buyer'),
  ('l.tran@transportltd.com.au',      'buyer')
) AS v(email, role)
JOIN "user" u ON u.email = v.email;

-- ---------------------------------------------------------------------------
-- Supplier profiles: one per verification state.
-- ---------------------------------------------------------------------------
INSERT INTO "supplier_profile"
  ("user_id", "business_name", "abn", "business_type", "status",
   "approved_by_user_id", "approved_at", "rejection_reason", "dispatch_sla_hours", "default_carrier",
   "submitted_at", "reviewed_at", "approval_acknowledged_at")
SELECT u.id, v.business_name, v.abn, v.business_type, v.status::supplier_status,
       admin.id, v.approved_at::timestamptz, v.rejection_reason, v.sla, v.carrier,
       v.submitted_at::timestamptz, v.reviewed_at::timestamptz, v.acknowledged_at::timestamptz
FROM (VALUES
  -- Bindi dismissed its approval notice, SafetyFirst has not: both sides of the once-only notice.
  ('priya@bindimedsupply.com.au',     'Bindi MedSupply Pty Ltd',  '51824753556', 'Medical consumables wholesaler', 'approved',       '2026-06-02 03:00:00+00', NULL,                        24, 'Australia Post', true,  '2026-05-28 02:00:00+00', '2026-06-02 03:00:00+00', '2026-06-02 04:00:00+00'),
  ('m.webb@safetyfirstdist.com.au',   'SafetyFirst Distribution', '82601334360', 'PPE and safety supplies',        'approved',       '2026-06-18 01:30:00+00', NULL,                        48, 'StarTrack',      true,  '2026-06-12 02:00:00+00', '2026-06-18 01:30:00+00', NULL),
  ('d.liu@cheaptestkits.com.au',      'Cheap Test Kits Direct',   '00000000000', 'Test kit reseller',              'rejected',       NULL,                     'ABN could not be verified', 48, NULL,             true,  '2026-07-20 02:00:00+00', '2026-07-24 05:00:00+00', NULL),
  -- Left pending on purpose: the admin verification queue must never be empty.
  ('r.patel@clinicalsupplies.com.au', 'Clinical Supplies Co',     '44000000012', 'Clinical consumables',           'pending_review', NULL,                     NULL,                        48, NULL,             false, '2026-07-25 02:00:00+00', NULL,                     NULL)
) AS v(email, business_name, abn, business_type, status, approved_at, rejection_reason, sla, carrier, decided, submitted_at, reviewed_at, acknowledged_at)
JOIN "user" u ON u.email = v.email
LEFT JOIN "user" admin ON admin.email = 'a.morgan@sampleassist.com.au' AND v.decided;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
INSERT INTO "category" ("name", "slug") VALUES
  ('Collection Kits',  'collection-kits'),
  ('Rapid Tests',      'rapid-tests'),
  ('Chain of Custody', 'chain-of-custody'),
  ('Supplies',         'supplies'),
  ('PPE',              'ppe');

-- Sub-categories, via the self-referencing parent_id (§6.6).
INSERT INTO "category" ("name", "slug", "parent_id")
SELECT v.name, v.slug, parent.id
FROM (VALUES
  ('Urine Collection', 'urine-collection', 'collection-kits'),
  ('Oral Fluid',       'oral-fluid',       'rapid-tests')
) AS v(name, slug, parent_slug)
JOIN "category" parent ON parent.slug = v.parent_slug;

-- ---------------------------------------------------------------------------
-- Products
-- Mix: in-stock, low, out, draft, second supplier, and a published one with an unapproved supplier.
-- Prices are GST-INCLUSIVE (§5).
-- ---------------------------------------------------------------------------
INSERT INTO "product"
  ("supplier_profile_id", "category_id", "name", "description", "sku", "price",
   "quantity", "low_stock_threshold", "listing_status", "brand", "manufacturer",
   "pack_size", "certification", "storage_conditions", "shelf_life_months")
SELECT sp.id, c.id, v.name, v.description, v.sku, v.price,
       v.quantity, v.low_stock_threshold, v.listing_status::listing_status,
       v.brand, v.manufacturer, v.pack_size, v.certification, v.storage_conditions, v.shelf_life
FROM (VALUES
  ('Bindi MedSupply Pty Ltd',  'collection-kits',  'Urine Collection Kit - Standard',    'Sealed 60mL specimen container with tamper-evident lid and integrity seals.', 'UCK-001', 24.99,  450,  50, 'published', 'Bindi',       'Bindi Medical',        'Single kit',    'AS/NZS 4308', 'Store below 25C', 36),
  ('Bindi MedSupply Pty Ltd',  'rapid-tests',      'Oral Fluid Rapid Test',              'Six-panel oral fluid screening device with saturation indicator.',           'OFT-002', 18.50,  280,  50, 'published', 'Bindi',       'Bindi Medical',        'Single device', 'AS/NZS 4760', 'Store 4-30C',     18),
  -- Low stock: quantity 12 sits below low_stock_threshold 20.
  ('Bindi MedSupply Pty Ltd',  'collection-kits',  'Hair Follicle Test Kit',             'Hair sample collection kit for extended-history drug screening.',            'HFT-003', 89.00,   12,  20, 'published', 'Bindi',       'Bindi Medical',        'Single kit',    NULL,          'Store below 25C', 24),
  ('Bindi MedSupply Pty Ltd',  'chain-of-custody', 'Chain of Custody Forms (50pk)',      'Triplicate chain of custody documentation, 50 forms per pack.',              'COC-004', 12.00, 1200, 100, 'published', 'Bindi',       'Bindi Medical',        '50 forms',      NULL,          'Keep dry',        NULL),
  ('Bindi MedSupply Pty Ltd',  'supplies',         'Breath Alcohol Mouthpieces (100pk)', 'Individually wrapped single-use mouthpieces with one-way valve.',            'BAM-005', 32.00,  340,  50, 'published', 'Bindi',       'Bindi Medical',        '100 pieces',    NULL,          'Store below 30C', 60),
  -- Out of stock: quantity 0 while still published.
  ('Bindi MedSupply Pty Ltd',  'collection-kits',  'Blood Collection Tubes Set',         'Vacuum blood collection tubes, mixed additive set.',                         'BCT-006', 45.00,    0,  25, 'published', 'Bindi',       'Bindi Medical',        'Set of 10',     'ISO 13485',   'Store 4-25C',     12),
  -- Second supplier, so multi-vendor behaviour has data behind it.
  ('SafetyFirst Distribution', 'ppe',              'Disposable Nitrile Gloves (100pk)',  'Powder-free nitrile examination gloves, medium.',                            'NGL-007', 15.50,  800, 100, 'published', 'SafetyFirst', 'SafetyFirst Mfg',      '100 gloves',    'AS/NZS 4011', 'Store below 30C', 60),
  -- Draft: never visible to buyers regardless of supplier status.
  ('Bindi MedSupply Pty Ltd',  'supplies',         'Biohazard Specimen Bags (200pk)',    'Zip-lock biohazard transport bags with document pouch.',                     'BSB-008',  9.75,    0,  50, 'draft',     'Bindi',       'Bindi Medical',        '200 bags',      NULL,          'Keep dry',        NULL),
  -- Published but supplier pending_review: needed to test the supplier-approved visibility rule.
  ('Clinical Supplies Co',     'supplies',         'Sterile Swab Packs (50pk)',          'Individually wrapped sterile swabs for surface sampling.',                    'SSP-009', 21.00,  150,  30, 'published', 'Clinical',    'Clinical Supplies Co', '50 swabs',      NULL,          'Keep dry',        36)
) AS v(business_name, category_slug, name, description, sku, price, quantity, low_stock_threshold, listing_status, brand, manufacturer, pack_size, certification, storage_conditions, shelf_life)
JOIN "supplier_profile" sp ON sp.business_name = v.business_name
JOIN "category" c ON c.slug = v.category_slug;

-- Catalogue volume for paging and the price and category filters (all published, approved suppliers).
INSERT INTO "product"
  ("supplier_profile_id", "category_id", "name", "description", "sku", "price",
   "quantity", "low_stock_threshold", "listing_status", "brand", "manufacturer",
   "pack_size", "certification", "storage_conditions", "shelf_life_months")
SELECT sp.id, c.id, v.name, v.description, v.sku, v.price,
       v.quantity, v.low_stock_threshold, 'published'::listing_status,
       v.brand, v.manufacturer, v.pack_size, v.certification, v.storage_conditions, v.shelf_life
FROM (VALUES
  -- Urine Collection (sub-category of Collection Kits)
  ('Bindi MedSupply Pty Ltd',  'urine-collection',  'Urine Collection Kit - Split Specimen', 'Split specimen kit with A and B bottles for confirmatory testing.',        'UCK-011',  27.50,  300,  50, 'Bindi',       'Bindi Medical',   'Single kit',    'AS/NZS 4308', 'Store below 25C', 36),
  ('Bindi MedSupply Pty Ltd',  'urine-collection',  'Urine Temperature Strips (100pk)',      'Adhesive temperature strips for specimen validity checks.',                'UCK-012',  16.00,  640,  80, 'Bindi',       'Bindi Medical',   '100 strips',    'AS/NZS 4308', 'Store below 25C', 24),
  ('Bindi MedSupply Pty Ltd',  'urine-collection',  'Specimen Transport Tubes (50pk)',       'Leak-resistant screw-cap tubes for laboratory transport.',                 'UCK-013',  34.00,  210,  40, 'Bindi',       'Bindi Medical',   '50 tubes',      NULL,          'Store below 30C', 36),
  -- Oral Fluid (sub-category of Rapid Tests)
  ('Bindi MedSupply Pty Ltd',  'oral-fluid',        'Oral Fluid Collection Device',          'Absorbent pad collector with volume adequacy indicator.',                  'OFT-014',  19.90,  480,  60, 'Bindi',       'Bindi Medical',   'Single device', 'AS/NZS 4760', 'Store 4-30C',     18),
  ('Bindi MedSupply Pty Ltd',  'oral-fluid',        'Oral Fluid 6-Panel Kit (25pk)',         'Bulk pack of six-panel oral fluid screening kits for onsite testing.',     'OFT-015', 129.00,   60,  15, 'Bindi',       'Bindi Medical',   '25 kits',       'AS/NZS 4760', 'Store 4-30C',     18),
  ('Bindi MedSupply Pty Ltd',  'oral-fluid',        'Saliva Alcohol Test Strips (50pk)',     'Single-use saliva alcohol strips with colour change scale.',               'OFT-016',  44.00,  150,  30, 'Bindi',       'Bindi Medical',   '50 strips',     NULL,          'Store 4-25C',     12),
  -- Rapid Tests
  ('Bindi MedSupply Pty Ltd',  'rapid-tests',       'Urine Drug Screen Cup 12-Panel',        'Integrated screening cup covering twelve drug classes.',                   'RDT-017',  21.50,  520,  80, 'Bindi',       'Bindi Medical',   'Single cup',    'AS/NZS 4308', 'Store 4-30C',     18),
  ('Bindi MedSupply Pty Ltd',  'rapid-tests',       'Urine Drug Screen Dip Card 5-Panel (25pk)', 'Economy dip cards for five-panel workplace screening.',                'RDT-018',  58.00,  130,  25, 'Bindi',       'Bindi Medical',   '25 cards',      'AS/NZS 4308', 'Store 4-30C',     18),
  ('Bindi MedSupply Pty Ltd',  'rapid-tests',       'Breath Alcohol Tester - Handheld',      'Fuel cell handheld breathalyser with digital display.',                    'RDT-019', 249.00,   18,  10, 'Bindi',       'Bindi Medical',   'Single unit',   'AS 3547',     'Store below 40C', NULL),
  ('Bindi MedSupply Pty Ltd',  'rapid-tests',       'Breath Alcohol Calibration Gas',        'Certified calibration gas cylinder for breathalyser servicing.',           'RDT-020',  95.00,   24,  12, 'Bindi',       'Bindi Medical',   '34L cylinder',  NULL,          'Store below 40C', 24),
  -- Chain of Custody
  ('Bindi MedSupply Pty Ltd',  'chain-of-custody',  'Chain of Custody Labels (500pk)',       'Numbered custody labels with signature and date fields.',                  'COC-021',  28.00,  400,  60, 'Bindi',       'Bindi Medical',   '500 labels',    NULL,          'Keep dry',        NULL),
  ('Bindi MedSupply Pty Ltd',  'chain-of-custody',  'Tamper-Evident Security Seals (250pk)', 'Void-on-removal seals for specimen containers.',                           'COC-022',  17.25,  700, 100, 'Bindi',       'Bindi Medical',   '250 seals',     NULL,          'Keep dry',        NULL),
  ('Bindi MedSupply Pty Ltd',  'chain-of-custody',  'Donor Consent Forms (100pk)',           'Donor declaration and consent forms in duplicate.',                        'COC-023',  11.50,  900, 120, 'Bindi',       'Bindi Medical',   '100 forms',     NULL,          'Keep dry',        NULL),
  ('Bindi MedSupply Pty Ltd',  'chain-of-custody',  'Collection Register Book',              'Bound register for recording daily collections onsite.',                   'COC-024',  39.00,   95,  20, 'Bindi',       'Bindi Medical',   'Single book',   NULL,          'Keep dry',        NULL),
  -- Supplies
  ('Bindi MedSupply Pty Ltd',  'supplies',          'Sharps Disposal Container 5L',          'Wall-mountable sharps container with locking lid.',                        'SUP-025',  22.00,  260,  40, 'Bindi',       'Bindi Medical',   '5 litre',       'AS 4031',     'Store below 30C', NULL),
  ('Bindi MedSupply Pty Ltd',  'supplies',          'Specimen Transport Esky 12L',           'Insulated transport box with cold brick for sample integrity.',            'SUP-026',  76.00,   45,  10, 'Bindi',       'Bindi Medical',   '12 litre',      NULL,          'Store below 30C', NULL),
  ('SafetyFirst Distribution', 'supplies',          'Absorbent Spill Pads (100pk)',          'High-absorbency pads for biological spill response.',                      'SUP-027',  33.50,  180,  30, 'SafetyFirst', 'SafetyFirst Mfg', '100 pads',      NULL,          'Keep dry',        NULL),
  ('SafetyFirst Distribution', 'supplies',          'Alcohol Wipes (200pk)',                 'Individually wrapped 70% isopropyl wipes.',                                'SUP-028',  14.00,  850, 100, 'SafetyFirst', 'SafetyFirst Mfg', '200 wipes',     NULL,          'Store below 25C', 36),
  ('Bindi MedSupply Pty Ltd',  'supplies',          'Thermal Label Rolls (6pk)',             'Direct thermal labels for specimen printers.',                             'SUP-029',  48.00,  120,  25, 'Bindi',       'Bindi Medical',   '6 rolls',       NULL,          'Keep dry',        24),
  ('Bindi MedSupply Pty Ltd',  'supplies',          'Sample Storage Racks',                  'Stackable racks holding 50 specimen tubes each.',                          'SUP-030',  65.00,   70,  15, 'Bindi',       'Bindi Medical',   'Rack of 50',    NULL,          'Store below 30C', NULL),
  -- PPE (SafetyFirst)
  ('SafetyFirst Distribution', 'ppe',               'Disposable Face Masks (50pk)',          'Level 1 surgical masks with ear loops.',                                   'PPE-031',  12.50, 1500, 200, 'SafetyFirst', 'SafetyFirst Mfg', '50 masks',      'AS 4381',     'Keep dry',        60),
  ('SafetyFirst Distribution', 'ppe',               'Safety Glasses - Clear',                'Anti-fog wraparound safety glasses for collection rooms.',                 'PPE-032',   9.90,  640, 100, 'SafetyFirst', 'SafetyFirst Mfg', 'Single pair',   'AS/NZS 1337', 'Keep dry',        NULL),
  ('SafetyFirst Distribution', 'ppe',               'Disposable Nitrile Gloves Large (100pk)', 'Powder-free nitrile examination gloves, large.',                         'PPE-033',  15.50,  900, 100, 'SafetyFirst', 'SafetyFirst Mfg', '100 gloves',    'AS/NZS 4011', 'Store below 30C', 60),
  ('SafetyFirst Distribution', 'ppe',               'Disposable Gowns (25pk)',               'Fluid-resistant single-use gowns with ties.',                              'PPE-034',  54.00,  140,  25, 'SafetyFirst', 'SafetyFirst Mfg', '25 gowns',      'AS 3789',     'Keep dry',        60),
  ('SafetyFirst Distribution', 'ppe',               'Face Shields (10pk)',                   'Full-face splash shields with foam brow band.',                            'PPE-035',  42.00,  210,  30, 'SafetyFirst', 'SafetyFirst Mfg', '10 shields',    NULL,          'Keep dry',        NULL),
  ('SafetyFirst Distribution', 'ppe',               'Hand Sanitiser 500mL (12pk)',           'Alcohol-based hand rub with pump top.',                                    'PPE-036',  68.00,   95,  20, 'SafetyFirst', 'SafetyFirst Mfg', '12 bottles',    'TGA listed',  'Store below 25C', 24),
  -- Collection Kits, including another low-stock and out-of-stock case
  ('Bindi MedSupply Pty Ltd',  'collection-kits',   'Collection Kit - Onsite Field Pack',    'Complete onsite pack with collection, custody and disposal items.',        'CKT-037', 112.00,   38,  10, 'Bindi',       'Bindi Medical',   'Field pack',    'AS/NZS 4308', 'Store below 25C', 24),
  ('Bindi MedSupply Pty Ltd',  'collection-kits',   'Collection Kit - Workplace Starter',    'Starter pack for a new workplace testing program.',                        'CKT-038',  58.50,  150,  25, 'Bindi',       'Bindi Medical',   'Starter pack',  'AS/NZS 4308', 'Store below 25C', 24),
  ('Bindi MedSupply Pty Ltd',  'collection-kits',   'Chaperone Collection Kit',              'Observed collection kit including chaperone documentation.',               'CKT-039',  26.00,    0,  20, 'Bindi',       'Bindi Medical',   'Single kit',    'AS/NZS 4308', 'Store below 25C', 36),
  ('Bindi MedSupply Pty Ltd',  'collection-kits',   'Saliva Collection Kit - Bulk (50pk)',   'Bulk saliva collection kits for large onsite programs.',                   'CKT-040', 189.00,   22,  25, 'Bindi',       'Bindi Medical',   '50 kits',       'AS/NZS 4760', 'Store 4-30C',     18)
) AS v(business_name, category_slug, name, description, sku, price, quantity, low_stock_threshold, brand, manufacturer, pack_size, certification, storage_conditions, shelf_life)
JOIN "supplier_profile" sp ON sp.business_name = v.business_name
JOIN "category" c ON c.slug = v.category_slug;

-- Retired, not deleted (§6.7): historical orders reference products.
INSERT INTO "product"
  ("supplier_profile_id", "category_id", "name", "description", "sku", "price",
   "quantity", "low_stock_threshold", "listing_status", "brand", "manufacturer", "pack_size")
SELECT sp.id, c.id, 'Legacy Saliva Test Strips', 'Superseded by the oral fluid rapid test. No longer sold.',
       'LST-010', 14.00, 0, 0, 'retired', 'Bindi', 'Bindi Medical', '25 strips'
FROM "supplier_profile" sp, "category" c
WHERE sp.business_name = 'Bindi MedSupply Pty Ltd' AND c.slug = 'rapid-tests';

-- ---------------------------------------------------------------------------
-- Carriers
-- ---------------------------------------------------------------------------
INSERT INTO "carrier" ("name") VALUES
  ('Australia Post'),
  ('StarTrack');

-- ---------------------------------------------------------------------------
-- Orders
-- gst_total = total / 11. One order per supplier; ORD-2026-00126 is SafetyFirst's so both have a queue.
-- ---------------------------------------------------------------------------
INSERT INTO "order"
  ("order_number", "user_id", "organisation_id", "supplier_profile_id",
   "status", "subtotal", "gst_total", "total", "placed_at")
SELECT v.order_number, u.id, o.id, sp.id,
       v.status::order_status, v.subtotal, v.gst_total, v.total, v.placed_at::timestamptz
FROM (VALUES
  ('ORD-2026-00122', 't.beckett@worksafe.com.au',    'WorkSafe Pty Ltd',  'Bindi MedSupply Pty Ltd',  'delivered',   45.44,  4.54,  49.98, '2026-08-10 23:15:00+00'),
  ('ORD-2026-00123', 'n.alvarez@safetycorp.com.au',  'Safety Corp',       'Bindi MedSupply Pty Ltd',  'delivered',   54.55,  5.45,  60.00, '2026-08-14 01:40:00+00'),
  ('ORD-2026-00124', 'o.fraser@transportltd.com.au', 'Transport Ltd',     'Bindi MedSupply Pty Ltd',  'dispatched',  87.27,  8.73,  96.00, '2026-08-24 04:05:00+00'),
  ('ORD-2026-00125', 's.chen@miningco.com.au',       'Mining Co Pty Ltd', 'Bindi MedSupply Pty Ltd',  'picking',    148.18, 14.82, 163.00, '2026-08-28 22:20:00+00'),
  ('ORD-2026-00126', 't.beckett@worksafe.com.au',    'WorkSafe Pty Ltd',  'SafetyFirst Distribution', 'placed',     140.91, 14.09, 155.00, '2026-08-31 06:10:00+00'),
  ('ORD-2026-00127', 's.chen@miningco.com.au',        'Mining Co Pty Ltd', 'Bindi MedSupply Pty Ltd',  'confirmed',   58.18,  5.82,  64.00, '2026-09-01 01:05:00+00'),
  ('ORD-2026-00128', 'o.fraser@transportltd.com.au', 'Transport Ltd',     'Bindi MedSupply Pty Ltd',  'cancelled',   40.91,  4.09,  45.00, '2026-08-29 03:40:00+00')
) AS v(order_number, email, org_name, business_name, status, subtotal, gst_total, total, placed_at)
JOIN "user" u ON u.email = v.email
JOIN "organisation" o ON o.name = v.org_name
JOIN "supplier_profile" sp ON sp.business_name = v.business_name;

UPDATE "order" SET "cancellation_reason" = 'Out of stock — supplier could not meet the dispatch SLA'
WHERE "order_number" = 'ORD-2026-00128';

-- Name, sku and price are SNAPSHOTS at checkout; editing a product must never change these rows.
INSERT INTO "order_item"
  ("order_id", "product_id", "product_name", "sku", "quantity", "unit_price_at_purchase", "line_total")
SELECT o.id, p.id, p.name, p.sku, v.quantity, v.unit_price, v.line_total
FROM (VALUES
  ('ORD-2026-00122', 'UCK-001',  2, 24.99,  49.98),
  ('ORD-2026-00123', 'COC-004',  5, 12.00,  60.00),
  ('ORD-2026-00124', 'BAM-005',  3, 32.00,  96.00),
  -- ORD-2026-00125 is the multi-line order.
  ('ORD-2026-00125', 'OFT-002',  4, 18.50,  74.00),
  ('ORD-2026-00125', 'HFT-003',  1, 89.00,  89.00),
  ('ORD-2026-00126', 'NGL-007', 10, 15.50, 155.00),
  ('ORD-2026-00127', 'BAM-005',  2, 32.00,  64.00),
  ('ORD-2026-00128', 'BCT-006',  1, 45.00,  45.00)
) AS v(order_number, sku, quantity, unit_price, line_total)
JOIN "order" o ON o.order_number = v.order_number
JOIN "product" p ON p.sku = v.sku;

-- ---------------------------------------------------------------------------
-- Invoices — deliberately NOT seeded.
-- An invoice is generated lazily with its PDF on first download (OrdersService.getInvoicePdf, ADR 0024),
-- so a seeded row would point at a missing file.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Payment — card_last4 and card_brand only. No card number, CVC or expiry (§6.13).
-- ---------------------------------------------------------------------------
INSERT INTO "payment"
  ("order_id", "method", "status", "amount", "transaction_reference", "card_last4", "card_brand", "paid_at")
SELECT o.id, v.method::payment_method, v.status::payment_status, o.total,
       'MOCK-TXN-' || right(o.order_number, 7), v.last4, v.brand, v.paid_at::timestamptz
FROM (VALUES
  ('ORD-2026-00122', 'card_mock',          'paid',    '4242', 'Visa',       '2026-08-10 23:16:00+00'),
  ('ORD-2026-00123', 'card_mock',          'paid',    '1881', 'Mastercard', '2026-08-14 01:41:00+00'),
  ('ORD-2026-00124', 'card_mock',          'paid',    '4242', 'Visa',       '2026-08-24 04:06:00+00'),
  ('ORD-2026-00125', 'card_mock',          'pending', '0005', 'Visa',       NULL),
  -- A failed attempt is why ORD-2026-00126 is still sitting at 'placed'.
  ('ORD-2026-00126', 'card_mock',          'failed',  '0341', 'Amex',       NULL),
  -- Account customers are invoiced rather than charged at checkout.
  ('ORD-2026-00127', 'invoice_on_account', 'pending', NULL,   NULL,         NULL),
  -- Cancelled for being out of stock, not for a payment problem: the card was
  -- charged before the supplier found they could not fulfil it, then refunded.
  ('ORD-2026-00128', 'card_mock',          'refunded', '9012', 'Mastercard', '2026-08-29 03:41:00+00')
) AS v(order_number, method, status, last4, brand, paid_at)
JOIN "order" o ON o.order_number = v.order_number;

-- ---------------------------------------------------------------------------
-- Deliveries — tracking_number lives here only, never on "order" (§6.16).
-- ---------------------------------------------------------------------------
INSERT INTO "delivery"
  ("order_id", "attention_name", "street_address", "suburb", "state", "postcode",
   "notes", "carrier_id", "tracking_number", "dispatched_at", "estimated_delivery_at", "delivered_at")
SELECT o.id, v.attention_name, v.street_address, v.suburb, v.state, v.postcode,
       v.notes, c.id, v.tracking_number, v.dispatched_at::timestamptz, v.estimated_delivery_at::timestamptz,
       v.delivered_at::timestamptz
-- Every order has a delivery row (address captured at checkout); carrier and tracking only once dispatched.
FROM (VALUES
  ('ORD-2026-00122', 'Tom Beckett',   '88 Industrial Drive', 'Dandenong',    'VIC', '3175', NULL,                        'Australia Post', 'AU9100000122', '2026-08-11 03:00:00+00', '2026-08-14 03:00:00+00', '2026-08-13 04:30:00+00'),
  ('ORD-2026-00123', 'Nina Alvarez',  '3 Compliance Court',  'Macquarie Park','NSW', '2113', NULL,                        'Australia Post', 'AU9100000123', '2026-08-15 01:00:00+00', '2026-08-18 01:00:00+00', '2026-08-18 02:10:00+00'),
  ('ORD-2026-00124', 'Owen Fraser',   '210 Freight Street',  'Laverton',     'VIC', '3028', 'Deliver to loading dock B', 'Australia Post', 'AU9123456789', '2026-08-25 02:00:00+00', '2026-08-28 02:00:00+00', NULL),
  ('ORD-2026-00125', 'Sarah Chen',    '5 Ore Road',          'Kalgoorlie',   'WA',  '6430', 'Site access via gate 2',    NULL,             NULL,           NULL,         NULL,         NULL),
  ('ORD-2026-00126', 'Tom Beckett',   '88 Industrial Drive', 'Dandenong',    'VIC', '3175', NULL,                        'StarTrack',      NULL,           NULL,         NULL,         NULL),
  ('ORD-2026-00127', 'Sarah Chen',    '5 Ore Road',          'Kalgoorlie',   'WA',  '6430', NULL,                        NULL,             NULL,           NULL,         NULL,         NULL),
  ('ORD-2026-00128', 'Owen Fraser',   '210 Freight Street',  'Laverton',     'VIC', '3028', NULL,                        NULL,             NULL,           NULL,         NULL,         NULL)
) AS v(order_number, attention_name, street_address, suburb, state, postcode, notes, carrier_name, tracking_number, dispatched_at, estimated_delivery_at, delivered_at)
JOIN "order" o ON o.order_number = v.order_number
LEFT JOIN "carrier" c ON c.name = v.carrier_name;

-- ---------------------------------------------------------------------------
-- Inventory — SA Clinics' SHELF stock, a different number from product.quantity
-- which is the supplier's sellable stock (§6.17).
-- ---------------------------------------------------------------------------
INSERT INTO "inventory" ("organisation_id", "product_id", "quantity_on_hand")
SELECT org.id, p.id, v.quantity_on_hand
FROM (VALUES
  ('SA Clinics Pty Ltd', 'UCK-001', 120),
  ('SA Clinics Pty Ltd', 'OFT-002',  45),
  ('SA Clinics Pty Ltd', 'COC-004', 300),
  ('SA Clinics Pty Ltd', 'BAM-005',  60),
  -- Mirrors DELIVERED orders ORD-2026-00122 and -00123 (§6.17).
  ('WorkSafe Pty Ltd',   'UCK-001',   2),
  ('Safety Corp',        'COC-004',   5)
) AS v(org_name, sku, quantity_on_hand)
JOIN "organisation" org ON org.name = v.org_name
JOIN "product" p ON p.sku = v.sku;

-- ---------------------------------------------------------------------------
-- Product images (§6.8). One primary per product so catalogue cards, product
-- detail pages and order lines all have imagery to render.
-- ---------------------------------------------------------------------------
INSERT INTO "product_image" ("product_id", "path", "alt_text", "sort_order", "is_primary")
SELECT p.id,
       'products/' || lower(p.sku) || '.jpg',
       p.name,
       0,
       true
FROM "product" p;

-- ---------------------------------------------------------------------------
-- Populated cart for Jordan Shaw; every other user has none (an empty cart is a required state).
-- ---------------------------------------------------------------------------
INSERT INTO "cart" ("user_id")
SELECT id FROM "user" WHERE email = 'j.shaw@saclinics.com.au';

INSERT INTO "cart_item" ("cart_id", "product_id", "quantity")
SELECT c.id, p.id, v.quantity
FROM (VALUES
  ('UCK-001', 3),
  ('COC-004', 2)
) AS v(sku, quantity)
JOIN "product" p ON p.sku = v.sku
JOIN "cart" c ON c.user_id = (SELECT id FROM "user" WHERE email = 'j.shaw@saclinics.com.au');
