const express = require('express')
const ExpressError = require('../expressError')
const router = express.Router()
const db = require('../db');

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT id, comp_code from invoices`)
        if (results.rows.length === 0) {
            throw new ExpressError(`No invoices available`, 404);
        } else {
            return res.status(200).json({ invoices: results.rows })
        }
    } catch (e) {
        return next(e);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const invoiceResult = await db.query(`SELECT * FROM invoices where id = $1`, [id]);
        if (invoiceResult.rows.length === 0) {
            throw new ExpressError(`Invoice ${id} not found`, 404);
        } else {
            const companyResult = await db.query(`SELECT * FROM companies where code = $1`, [invoiceResult.rows[0].comp_code]);
            const company = companyResult.rows[0]
            const { amt, paid, add_date, paid_date } = invoiceResult.rows[0]
            return res.status(200).json({
                invoice: { id, amt, paid, add_date, paid_date, company }
            });
        }
    } catch (e) {
        return next(e);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (!req.body.comp_code || !req.body.amt) {
            throw new ExpressError(`Request does not contain the required information please resubmit`, 400);
        } else {
            const { comp_code, amt } = req.body;
            const now = new Date();
            const result = await db.query(`INSERT INTO invoices (comp_code, amt, add_date) VALUES ($1, $2, $3) RETURNING  *`, [comp_code, amt, now]);
            if (result.rows.length === 0) {
                throw new ExpressError(`Error saving invoice with ${comp_code}, ${amt} to database, please try again`, 500);
            } else {
                return res.status(201).json({ invoice: result.rows[0] })
            }
        }

    } catch (e) {
        return next(e);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const invoice = await db.query(`SELECT * FROM invoices where id = $1`, [id])
        if (invoice.rows.length === 0) {
            throw new ExpressError(`Invoice id ${id} not found`, 404);
        } else if (!req.body.amt) {
            throw new ExpressError(`Invoice Amt value not submitted please resubmit`, 400);
        } else {
            const { amt } = req.body;
            const result = await db.query(`UPDATE invoices SET amt=$1 WHERE id =$2 RETURNING *`, [amt, id]);
            if (result.rows.length === 0) {
                throw new ExpressError(`Error updating invoice ${id} with ammount ${amt} please try again`, 500);
            } else {
                return res.status(200).json({ invoice: result.rows[0] })
            }
        }
    } catch (e) {
        return next(e);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT * FROM invoices WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            throw new ExpressError(`Invoice id ${id} not found`, 404);
        } else {
            const deleteInvoice = await db.query(`DELETE FROM invoices where id = $1`, [id])
            return res.status(200).json({ status: "deleted" })
        }
    } catch (e) {
        return next(e)
    }
});

router.get('/company/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const companyResult = await db.query(`SELECT * FROM companies WHERE code = $1`, [code])
        if (companyResult.rows.length === 0) {
            throw new ExpressError(`Company code ${code} not found.`, 404);
        } else {
            const companyInvoices = await db.query(`SELECT * FROM invoices WHERE comp_code = $1`, [code])
            return res.status(200).json({ company: { ...companyResult.rows[0], invoices: companyInvoices.rows } })
        }
    } catch (e) {
        return next(e);
    }
})




module.exports = router;


// -- DATA MODEL
// -- companies
// --  code  |      name      |  description
// -- -------+----------------+---------------
// --  apple | Apple Computer | Maker of OSX.
// --  ibm   | IBM            | Big blue.

// -- invoices
// --  id | comp_code | amt | paid |  add_date  | paid_date
// -- ----+-----------+-----+------+------------+------------
// --   1 | apple     | 100 | f    | 2024-03-06 |
// --   2 | apple     | 200 | f    | 2024-03-06 |
// --   3 | apple     | 300 | t    | 2024-03-06 | 2018-01-01
// --   4 | ibm       | 400 | f    | 2024-03-06 |