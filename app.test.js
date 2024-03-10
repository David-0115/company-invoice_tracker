process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('./app');
const db = require('./db');

beforeEach(async () => {
    const companies = await db.query('SELECT * FROM companies');
    const invoices = await db.query('SELECT * FROM invoices');
    if (companies.rows.length === 0 || invoices.rows.length === 0) {
        await Promise.all([
            db.query(`
                INSERT INTO companies (code, name, description)
                VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
                       ('ibm', 'IBM', 'Big blue.')`),
            db.query(`  
                INSERT INTO invoices (comp_Code, amt, paid, paid_date)
                VALUES ('apple', 100, false, null),
                       ('apple', 200, false, null),
                       ('apple', 300, true, '2018-01-01'),
                       ('ibm', 400, false, null);`)
        ]);
    };

});


describe('GET /companies', () => {
    test('GET / returns a list of companies', async () => {
        const resp = await request(app).get('/companies');
        const expected = {
            "companies": [
                {
                    "code": "apple",
                    "name": "Apple Computer"
                },
                {
                    "code": "ibm",
                    "name": "IBM"
                }
            ]
        };
        expect(resp.statusCode).toBe(200)
        expect(resp.body).toEqual(expected);
    })
});

describe('GET /companies/code', () => {
    test('GET /:code returns the company based upon code', async () => {
        const resp = await request(app).get('/companies/ibm');
        const expected = {
            "company": {
                "code": "ibm",
                "name": "IBM",
                "description": "Big blue."
            }
        };
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(expected);
    });

    test('GET /companies/: wrong code returns 404', async () => {
        const resp = await request(app).get('/companies/wrong_code');
        expected = {
            "error": {
                "message": "Company wrong_code not found",
                "status": 404
            },
            "message": "Company wrong_code not found"
        }
        expect(resp.statusCode).toBe(404);
        expect(resp.body).toEqual(expected);
    });

});

describe('POST /companies', () => {
    test('POST / creates a new company', async () => {
        const post = { code: "msft", name: "Microsoft", description: "Software company" };
        const resp = await request(app)
            .post('/companies')
            .send(post);
        expect(resp.statusCode).toBe(201)
        expect(resp.body).toEqual({ "company": post });
    });

    test('POST / with incomplete information throws error', async () => {
        const post = { code: "NVDA", name: "NVIDIA" };
        const resp = await request(app)
            .post('/companies')
            .send(post);
        expect(resp.statusCode).toBe(400)
    });
});

describe('PATCH /companies/code', () => {
    test('PATCH /:code updates a company (single field)', async () => {
        const resp = await request(app)
            .patch('/companies/ibm')
            .send({ description: "Hardware manufacturer, aka Big Blue" });
        expect(resp.statusCode).toBe(200);
        const expected = {
            "company": {
                "code": "ibm",
                "name": "IBM",
                "description": "Hardware manufacturer, aka Big Blue"
            }
        };
        expect(resp.body).toEqual(expected);
    });

    test('PATCH /:code updates a company (all fields)', async () => {
        const patch = { code: "apple", name: "Apple Inc,", description: "Hardware & Software manufacturer" }
        const resp = await request(app)
            .patch('/companies/apple')
            .send(patch);

        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ "company": patch })
    });

    test('PATCH /:code with wrong code returns 404', async () => {
        const patch = { code: "no_comp" };
        const resp = await request(app)
            .patch('/companies/wrong-company')
            .send(patch);
        expect(resp.statusCode).toBe(404)
    });
});

describe('DELETE /companies/:code', () => {
    test('DELETE /:code deletes a company', async () => {
        const resp = await request(app).delete('/companies/ibm');
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ "status": "deleted" })
    });
    test('DELETE /:code with wrong code returns 404', async () => {
        const resp = await request(app).delete('/companies/noCompany');
        expect(resp.statusCode).toBe(404);
    })
});

describe('GET /invoices', () => {
    test('GET / should return a list invoices', async () => {
        const resp = await request(app).get('/invoices');
        const expected = {
            "invoices": [
                {
                    "id": expect.any(Number),
                    "comp_code": "apple"
                },
                {
                    "id": expect.any(Number),
                    "comp_code": "apple"
                },
                {
                    "id": expect.any(Number),
                    "comp_code": "apple"
                },
                {
                    "id": expect.any(Number),
                    "comp_code": "ibm"
                }
            ]
        };
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(expected);
    });
});

describe('GET /invoices/id', () => {
    test('Get /id returns details about a specific invoice', async () => {
        const result = await db.query(`SELECT * FROM invoices WHERE comp_code = 'ibm'`);
        const result1 = await db.query(`SELECT * FROM companies WHERE code = 'ibm'`);
        const inv = result.rows[0];
        const company = result1.rows[0];
        const expected = {
            invoice: {
                id: String(inv.id),
                amt: inv.amt,
                add_date: inv.add_date.toISOString(),
                paid_date: inv.paid_date,
                paid: inv.paid,
                company
            }
        }
        const resp = await request(app).get(`/invoices/${inv.id}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(expected);

    });

    test('Get /id with invalid code returns 404', async () => {
        const resp = await request(app).get('/invoices/0');
        expect(resp.statusCode).toBe(404);
    });
});

describe('POST /invoices', () => {
    test('POST /invoices creates a new invoice', async () => {
        const post = { comp_code: "ibm", amt: 10000 }
        const resp = await request(app).post('/invoices').send(post);
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({
            invoice: {
                "id": expect.any(Number),
                "comp_code": "ibm",
                "amt": 10000,
                "paid": false,
                "add_date": expect.any(String),
                "paid_date": null
            }
        });
    });
    test('POST /invoices with invalid comp_code throws error', async () => {
        const post = { comp_code: "none", amt: 5 };
        const resp = await request(app).post('/invoices').send(post);
        expect(resp.statusCode).toBe(500);
    });

});

describe('PUT /invoices', () => {
    test('PUT /invoices/id updates invoice amount adds to an amount', async () => {
        const result = await db.query(`SELECT * FROM invoices WHERE comp_code = 'ibm'`);
        const inv = result.rows[0];
        const resp = await request(app).put(`/invoices/${inv.id}`).send({ "amt": 200, "paid": false });

        inv.add_date = inv.add_date.toISOString();
        inv.paid_date = null;
        inv.paid = false;
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            invoice: {
                "id": inv.id,
                "comp_code": inv.comp_code,
                "amt": inv.amt + 200,
                "add_date": expect.any(String),
                "paid_date": null
            }
        });
    });

    test('PUT /invoices/id updates invoice amount, pays an amount', async () => {
        const result = await db.query(`SELECT * FROM invoices WHERE comp_code = 'ibm'`);
        const inv = result.rows[0];
        const resp = await request(app).put(`/invoices/${inv.id}`).send({ "amt": 200, "paid": true });

        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            invoice: {
                "id": inv.id,
                "comp_code": inv.comp_code,
                "amt": inv.amt - 200,
                "add_date": expect.any(String),
                "paid_date": expect.any(String)
            }
        });
    });

    test('PUT /invoices/invalid_id throws error', async () => {
        const resp = await request(app).put('/invoices/0').send({ "amt": 0 });
        expect(resp.statusCode).toBe(404);
    });

    test('PUT /invoices/id with no /blank amt throws error', async () => {
        const result = await db.query(`SELECT * FROM invoices WHERE comp_code = 'ibm'`);
        const inv = result.rows[0];
        const resp = await request(app).put(`/invoices/${inv.id}`).send({ "amt": "" });
        expect(resp.statusCode).toBe(400);

        const resp1 = await request(app).put(`/invoices/${inv.id}`).send();
        expect(resp1.statusCode).toBe(400);
    });

});

describe('DELETE /invoices/id', () => {
    test('DELETE /invoices/id deletes invoice', async () => {
        const result = await db.query(`SELECT * FROM invoices WHERE comp_code = 'apple'`);
        const inv = result.rows[0];
        const resp = await request(app).delete(`/invoices/${inv.id}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ "status": "deleted" })
    });

    test('DELETE /invoices/invalid_id throws error', async () => {
        const resp = await request(app).delete(`/invoices/0`);
        expect(resp.statusCode).toBe(404);
    });
});

describe('GET /invoices/company/code', () => {
    test('GET /invoices/company/code returns list of invoices for company', async () => {
        const result = await db.query(`SELECT * FROM invoices WHERE comp_code = 'ibm'`);
        const inv = result.rows[0];
        const resp = await request(app).get(`/invoices/company/${inv.comp_code}`);
        const expected = {
            "company": {
                "code": "ibm",
                "name": "IBM",
                "description": "Big blue.",
                "invoices": [
                    {
                        "id": expect.any(Number),
                        "comp_code": "ibm",
                        "amt": 400,
                        "paid": false,
                        "add_date": expect.any(String),
                        "paid_date": null
                    }
                ]
            }
        };
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(expected);
    });

    test('GET /invoices/company/invalid_id throws error', async () => {
        const resp = await request(app).delete(`/invoices/0`);
        expect(resp.statusCode).toBe(404);
    })
})

afterEach(async () => {
    await Promise.all([
        db.query("DELETE FROM companies"),
        db.query("DELETE FROM invoices")
    ])
})

afterAll(async function () {
    // close db connection
    await db.end();
});
