const express = require('express')
const ExpressError = require('../expressError')
const router = express.Router()
const db = require('../db');


router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT code,name FROM companies`);
        if (results.rows.length === 0) {
            throw new ExpressError(`No companies were found`, 404);
        } else {
            return res.status(200).json({ companies: results.rows })
        }
    } catch (e) {
        return next(e);
    }
});

router.get('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const result = await db.query(`SELECT * FROM companies where code = $1`, [code]);
        if (result.rows.length === 0) {
            throw new ExpressError(`Company ${code} not found`, 404)
        } else {
            return res.status(200).json({ company: result.rows[0] });
        }
    } catch (e) {
        return next(e);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (!req.body.code || !req.body.name || !req.body.description) {
            throw new ExpressError(`Request missing required information, please resubmit`, 400)
        } else {
            const { code, name, description } = req.body
            const result = await db.query(`INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`, [code, name, description]);
            return res.status(201).json({ company: result.rows[0] })
        }
    } catch (e) {
        return next(e);
    }
});

router.patch('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const result = await db.query(`SELECT * FROM companies where code = $1`, [code]);
        if (result.rows.length === 0) {
            throw new ExpressError(`Company ${code} not found`, 404);
        } else {
            const company = result.rows[0];
            const rb = req.body;
            const name = rb.name ? rb.name : company.name;
            const description = rb.description ? rb.description : company.description;

            const updateQuery = `
            UPDATE companies
            SET name = $1, description = $2
            WHERE code = $3
            RETURNING *`;
            const updateParams = [name, description, code];
            const updateResult = await db.query(updateQuery, updateParams);

            return res.status(200).json({ company: updateResult.rows[0] });

        }
    } catch (e) {
        return next(e);
    }
});

router.delete('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const queryText = `SELECT * FROM companies where code = $1`;
        const queryParams = [code];
        const result = await db.query(queryText, queryParams);
        if (result.rows.length === 0) {
            throw new ExpressError(`Company code ${code} not found`, 404);
        } else {
            const deleteQText = `DELETE FROM compaines where code = $1`;
            const deleteQuery = db.query(deleteQText, queryParams);
            return res.status(200).json({ status: "deleted" });
        }
    } catch (e) {
        return next(e)
    }
});


module.exports = router;

