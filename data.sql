\c biztime

DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS companies;

CREATE TABLE companies (
    code text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text
);

CREATE TABLE invoices (
    id serial PRIMARY KEY,
    comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
    amt float NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    add_date date DEFAULT CURRENT_DATE NOT NULL,
    paid_date date,
    CONSTRAINT invoices_amt_check CHECK ((amt > (0)::double precision))
);

INSERT INTO companies
  VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
         ('ibm', 'IBM', 'Big blue.');

INSERT INTO invoices (comp_Code, amt, paid, paid_date)
  VALUES ('apple', 100, false, null),
         ('apple', 200, false, null),
         ('apple', 300, true, '2018-01-01'),
         ('ibm', 400, false, null);

-- DATA MODEL
-- companies
--  code  |      name      |  description
-- -------+----------------+---------------
--  apple | Apple Computer | Maker of OSX.
--  ibm   | IBM            | Big blue.

-- invoices
--  id | comp_code | amt | paid |  add_date  | paid_date
-- ----+-----------+-----+------+------------+------------
--   1 | apple     | 100 | f    | 2024-03-06 |
--   2 | apple     | 200 | f    | 2024-03-06 |
--   3 | apple     | 300 | t    | 2024-03-06 | 2018-01-01
--   4 | ibm       | 400 | f    | 2024-03-06 |