import { Router } from 'express';
import * as svc from '../services/booking.service';

const r = Router();

r.post('/', async (req, res) => {
  try {
    const b = await svc.createBooking(req.body);
    res.status(201).json(b);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

r.get('/', async (req, res) => {
  try {
    const list = await svc.listBookings(req.query);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

r.get('/:id', async (req, res) => {
  try {
    const b = await svc.getBooking(req.params.id);
    if (\!b) return res.sendStatus(404);
    res.json(b);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

r.patch('/:id', async (req, res) => {
  try {
    const b = await svc.updateBooking(req.params.id, req.body);
    res.json(b);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

r.patch('/:id/status', async (req, res) => {
  try {
    const b = await svc.changeStatus(req.params.id, req.body.status);
    res.json(b);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default r;
EOF < /dev/null
