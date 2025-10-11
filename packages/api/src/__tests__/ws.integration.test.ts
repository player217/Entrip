import { createServer } from 'http';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { initializeWebSocket, broadcastBookingUpdateForCompany } from '../ws';
import { jwtService } from '../lib/jwt.service';

describe('WS booking events (cookie-first auth)', () => {
  let httpServer: any;
  let port: number;

  beforeAll(async () => {
    httpServer = createServer((_, res) => res.end('ok'));
    initializeWebSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        // @ts-ignore
        port = httpServer.address().port as number;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('receives booking:create via company room using cookie auth', async () => {
    const payload = {
      id: 'user-1',
      email: 'ws@test.com',
      name: 'WS Tester',
      role: 'ADMIN' as any,
      companyCode: 'j1',
    };
    const token = jwtService.signAccessToken(payload);

    const client: ClientSocket = ioc(`http://localhost:${port}`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: `auth-token=${token}`,
      },
      path: '/socket.io/',
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(err));
    });

    const received = new Promise<void>((resolve) => {
      client.on('booking:create', (data: any) => {
        expect(data.bookingId).toBe('booking-xyz');
        expect(data.companyCode).toBe('j1');
        resolve();
      });
    });

    broadcastBookingUpdateForCompany('j1', 'create', 'booking-xyz');

    await received;
    client.disconnect();
  });
});

