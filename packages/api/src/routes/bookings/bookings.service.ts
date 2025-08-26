import { BookingCreateInput } from './dtos/BookingCreate.dto';
import { BookingUpdateInput } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchInput } from './dtos/BookingStatusPatch.dto';
import { ApiError } from '../../middlewares/error.middleware';

// Temporary in-memory storage (replace with database)
interface Booking {
  id: string;
  teamName: string;
  type: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalPax: number;
  coordinator: string;
  revenue?: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

let bookings: Booking[] = [];
let idCounter = 1;

export class BookingsService {
  async findAll(page: number = 1, limit: number = 20) {
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedBookings = bookings.slice(start, end);

    return {
      data: paginatedBookings,
      pagination: {
        page,
        limit,
        total: bookings.length,
        pages: Math.ceil(bookings.length / limit),
      },
    };
  }

  async findById(id: string) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }
    return booking;
  }

  async create(input: BookingCreateInput) {
    const newBooking: Booking = {
      id: String(idCounter++),
      ...input,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    bookings.push(newBooking);
    return newBooking;
  }

  async update(id: string, input: BookingUpdateInput) {
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) {
      throw new ApiError(404, 'Booking not found');
    }

    bookings[index] = {
      ...bookings[index],
      ...input,
      updatedAt: new Date(),
    };

    return bookings[index];
  }

  async updateStatus(id: string, input: BookingStatusPatchInput) {
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) {
      throw new ApiError(404, 'Booking not found');
    }

    bookings[index] = {
      ...bookings[index],
      status: input.status,
      notes: input.notes || bookings[index].notes,
      updatedAt: new Date(),
    };

    return bookings[index];
  }

  async delete(id: string) {
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) {
      throw new ApiError(404, 'Booking not found');
    }

    const deleted = bookings[index];
    bookings = bookings.filter(b => b.id !== id);
    return deleted;
  }

  // Utility method for testing
  async clearAll() {
    bookings = [];
    idCounter = 1;
  }
}

export const bookingsService = new BookingsService();