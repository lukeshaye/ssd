// src/worker/index.ts

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import { z } from "zod"; // Importar o Zod para criar schemas locais
import { zValidator } from '@hono/zod-validator'; // Importar o middleware de validação
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

// Importar os schemas de validação compartilhados
import {
  CreateClientSchema,
  AppointmentFormSchema as CreateAppointmentSchema, // Renomeado para consistência
  CreateFinancialEntrySchema,
  CreateProductSchema,
  CreateProfessionalSchema,
} from '../shared/types';

// --- Schemas de Validação Locais ---
const BusinessSettingsSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(), // Formato HH:MM
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(), // Formato HH:MM
});

const BusinessExceptionSchema = z.object({
  exception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Formato YYYY-MM-DD
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
});

const AbsenceSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().optional().nullable(),
});


const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use("*", cors({
  origin: ["http://localhost:5173", "https://localhost:5173"],
  credentials: true,
}));

// --- Rotas de Autenticação ---
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });
  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();
  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }
  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });
  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true, path: "/", sameSite: "none", secure: true, maxAge: 60 * 24 * 60 * 60,
  });
  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }
  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true, path: '/', sameSite: 'none', secure: true, maxAge: 0,
  });
  return c.json({ success: true }, 200);
});


// --- Rotas do Dashboard ---
app.get("/api/dashboard/kpis", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const today = new Date().toISOString().split('T')[0];
  const dailyEarnings = await c.env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_entries WHERE user_id = ? AND type = 'receita' AND entry_date = ?`).bind(user.id, today).first();
  const dailyAppointments = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND DATE(appointment_date) = ?`).bind(user.id, today).first();
  const avgTicket = await c.env.DB.prepare(`SELECT COALESCE(AVG(price), 0) as avg FROM appointments WHERE user_id = ? AND DATE(appointment_date) = ? AND attended = 1`).bind(user.id, today).first();
  return c.json({ dailyEarnings: dailyEarnings?.total || 0, dailyAppointments: dailyAppointments?.count || 0, avgTicket: avgTicket?.avg || 0 });
});

app.get("/api/dashboard/today-appointments", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const today = new Date().toISOString().split('T')[0];
  const appointments = await c.env.DB.prepare(`SELECT * FROM appointments WHERE user_id = ? AND DATE(appointment_date) = ? ORDER BY appointment_date ASC`).bind(user.id, today).all();
  return c.json(appointments.results);
});


// --- Rotas de Clientes ---
app.get("/api/clients", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const clients = await c.env.DB.prepare(`SELECT * FROM clients WHERE user_id = ? ORDER BY name ASC`).bind(user.id).all();
  return c.json(clients.results);
});

app.post("/api/clients", authMiddleware, zValidator('json', CreateClientSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');
    const result = await c.env.DB.prepare(`
      INSERT INTO clients (user_id, name, phone, email, notes, birth_date, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user.id, validatedData.name, validatedData.phone || null, validatedData.email || null, validatedData.notes || null, validatedData.birth_date ? new Date(validatedData.birth_date).toISOString().split('T')[0] : null, validatedData.gender || null).run();
    const newClient = await c.env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(result.meta.last_row_id).first();
    return c.json(newClient, 201);
});

app.put("/api/clients/:id", authMiddleware, zValidator('json', CreateClientSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const clientId = c.req.param('id');
    const validatedData = c.req.valid('json');
    await c.env.DB.prepare(`
      UPDATE clients SET name = ?, phone = ?, email = ?, notes = ?, birth_date = ?, gender = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(validatedData.name, validatedData.phone || null, validatedData.email || null, validatedData.notes || null, validatedData.birth_date ? new Date(validatedData.birth_date).toISOString().split('T')[0] : null, validatedData.gender || null, clientId, user.id).run();
    return c.json({ success: true });
});

app.delete("/api/clients/:id", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const clientId = c.req.param('id');
    await c.env.DB.prepare(`DELETE FROM clients WHERE id = ? AND user_id = ?`).bind(clientId, user.id).run();
    return c.json({ success: true });
});


// --- Rotas Financeiras ---
app.get("/api/financial/entries", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entries = await c.env.DB.prepare(`SELECT * FROM financial_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 100`).bind(user.id).all();
    return c.json(entries.results);
});

app.post("/api/financial/entries", authMiddleware, zValidator('json', CreateFinancialEntrySchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');
    const result = await c.env.DB.prepare(`
      INSERT INTO financial_entries (user_id, description, amount, type, entry_type, entry_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(user.id, validatedData.description, validatedData.amount, validatedData.type, validatedData.entry_type, new Date(validatedData.entry_date).toISOString().split('T')[0]).run();
    return c.json({ id: result.meta.last_row_id }, 201);
});

app.put("/api/financial/entries/:id", authMiddleware, zValidator('json', CreateFinancialEntrySchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entryId = c.req.param('id');
    const validatedData = c.req.valid('json');
    await c.env.DB.prepare(`
      UPDATE financial_entries SET description = ?, amount = ?, type = ?, entry_type = ?, entry_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(validatedData.description, validatedData.amount, validatedData.type, validatedData.entry_type, new Date(validatedData.entry_date).toISOString().split('T')[0], entryId, user.id).run();
    return c.json({ success: true });
});

app.delete("/api/financial/entries/:id", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entryId = c.req.param('id');
    await c.env.DB.prepare(`DELETE FROM financial_entries WHERE id = ? AND user_id = ?`).bind(entryId, user.id).run();
    return c.json({ success: true });
});


// --- Rotas de Produtos ---
app.get("/api/products", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const products = await c.env.DB.prepare(`SELECT * FROM products WHERE user_id = ? ORDER BY name ASC`).bind(user.id).all();
    return c.json(products.results);
});

app.post("/api/products", authMiddleware, zValidator('json', CreateProductSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');
    const result = await c.env.DB.prepare(`
      INSERT INTO products (user_id, name, description, price, quantity, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(user.id, validatedData.name, validatedData.description || null, validatedData.price, validatedData.quantity || 0, validatedData.image_url || null).run();
    return c.json({ id: result.meta.last_row_id }, 201);
});

app.put("/api/products/:id", authMiddleware, zValidator('json', CreateProductSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const productId = c.req.param('id');
    const validatedData = c.req.valid('json');
    await c.env.DB.prepare(`
      UPDATE products SET name = ?, description = ?, price = ?, quantity = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(validatedData.name, validatedData.description || null, validatedData.price, validatedData.quantity || 0, validatedData.image_url || null, productId, user.id).run();
    return c.json({ success: true });
});

app.delete("/api/products/:id", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const productId = c.req.param('id');
    await c.env.DB.prepare(`DELETE FROM products WHERE id = ? AND user_id = ?`).bind(productId, user.id).run();
    return c.json({ success: true });
});


// --- Rotas de Profissionais (ATUALIZADO) ---
app.get("/api/professionals", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const professionals = await c.env.DB.prepare(`SELECT * FROM professionals WHERE user_id = ? ORDER BY name ASC`).bind(user.id).all();
    return c.json(professionals.results);
});

app.post("/api/professionals", authMiddleware, zValidator('json', CreateProfessionalSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');
    const result = await c.env.DB.prepare(`
      INSERT INTO professionals (user_id, name, color, salary, commission_rate)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
        user.id,
        validatedData.name,
        validatedData.color || null,
        validatedData.salary || null,
        validatedData.commission_rate || null
    ).run();
    return c.json({ id: result.meta.last_row_id }, 201);
});

app.put("/api/professionals/:id", authMiddleware, zValidator('json', CreateProfessionalSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const professionalId = c.req.param('id');
    const validatedData = c.req.valid('json');
    await c.env.DB.prepare(`
      UPDATE professionals SET name = ?, color = ?, salary = ?, commission_rate = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(
        validatedData.name,
        validatedData.color || null,
        validatedData.salary || null,
        validatedData.commission_rate || null,
        professionalId,
        user.id
    ).run();
    return c.json({ success: true });
});

app.delete("/api/professionals/:id", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const professionalId = c.req.param('id');
    await c.env.DB.prepare(`DELETE FROM professionals WHERE id = ? AND user_id = ?`).bind(professionalId, user.id).run();
    return c.json({ success: true });
});

// Adiciona uma nova falta para um profissional
app.post("/api/professionals/:id/absences", authMiddleware, zValidator('json', AbsenceSchema), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const professionalId = c.req.param('id');
  const { date, reason } = c.req.valid('json');

  const result = await c.env.DB.prepare(`INSERT INTO professional_absences (professional_id, date, reason, user_id) VALUES (?, ?, ?, ?)`).bind(professionalId, date, reason, user.id).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

// Remove uma falta
app.delete("/api/professionals/absences/:absence_id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const absenceId = c.req.param('absence_id');
  await c.env.DB.prepare(`DELETE FROM professional_absences WHERE id = ? AND user_id = ?`).bind(absenceId, user.id).run();
  return c.json({ success: true });
});


// --- Rotas de Configurações ---
app.post("/api/settings/business", authMiddleware, zValidator('json', z.array(BusinessSettingsSchema)), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');

    const stmt = c.env.DB.prepare(`
      INSERT INTO business_settings (user_id, day_of_week, start_time, end_time)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, day_of_week) DO UPDATE SET
      start_time = excluded.start_time,
      end_time = excluded.end_time;
    `);

    const batch = validatedData.map(day => stmt.bind(user.id, day.day_of_week, day.start_time, day.end_time));
    await c.env.DB.batch(batch);

    return c.json({ success: true }, 201);
});

app.post("/api/settings/exceptions", authMiddleware, zValidator('json', BusinessExceptionSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');
    const result = await c.env.DB.prepare(`
      INSERT INTO business_exceptions (user_id, exception_date, start_time, end_time, description)
      VALUES (?, ?, ?, ?, ?)
    `).bind(user.id, validatedData.exception_date, validatedData.start_time || null, validatedData.end_time || null, validatedData.description).run();
    return c.json({ id: result.meta.last_row_id }, 201);
});


// --- Rotas de Agendamentos ---
app.get("/api/appointments", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const appointments = await c.env.DB.prepare(`SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date ASC`).bind(user.id).all();
    return c.json(appointments.results);
});

app.post("/api/appointments", authMiddleware, zValidator('json', CreateAppointmentSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const validatedData = c.req.valid('json');
    
    // Pegar nomes de relacionamentos
    const client = await c.env.DB.prepare(`SELECT name FROM clients WHERE id = ? AND user_id = ?`).bind(validatedData.client_id, user.id).first();
    const professional = await c.env.DB.prepare(`SELECT name FROM professionals WHERE id = ? AND user_id = ?`).bind(validatedData.professional_id, user.id).first();
    const service = await c.env.DB.prepare(`SELECT name FROM services WHERE id = ? AND user_id = ?`).bind(validatedData.service_id, user.id).first();

    if (!client || !professional || !service) {
      return c.json({ error: "Invalid data provided" }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO appointments (user_id, client_id, professional_id, service_id, client_name, service, professional, price, appointment_date, end_date, attended)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(user.id, validatedData.client_id, validatedData.professional_id, validatedData.service_id, client.name, service.name, professional.name, validatedData.price, validatedData.appointment_date, validatedData.end_date, validatedData.attended || false).run();
    return c.json({ id: result.meta.last_row_id }, 201);
});

app.put("/api/appointments/:id", authMiddleware, zValidator('json', CreateAppointmentSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const appointmentId = c.req.param('id');
    const validatedData = c.req.valid('json');

    const client = await c.env.DB.prepare(`SELECT name FROM clients WHERE id = ? AND user_id = ?`).bind(validatedData.client_id, user.id).first();
    const professional = await c.env.DB.prepare(`SELECT name FROM professionals WHERE id = ? AND user_id = ?`).bind(validatedData.professional_id, user.id).first();
    const service = await c.env.DB.prepare(`SELECT name FROM services WHERE id = ? AND user_id = ?`).bind(validatedData.service_id, user.id).first();

    if (!client || !professional || !service) {
      return c.json({ error: "Invalid data provided" }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE appointments SET client_id = ?, professional_id = ?, service_id = ?, client_name = ?, service = ?, professional = ?, price = ?, appointment_date = ?, end_date = ?, attended = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(validatedData.client_id, validatedData.professional_id, validatedData.service_id, client.name, service.name, professional.name, validatedData.price, validatedData.appointment_date, validatedData.end_date, validatedData.attended || false, appointmentId, user.id).run();
    return c.json({ success: true });
});

app.delete("/api/appointments/:id", authMiddleware, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const appointmentId = c.req.param('id');
    await c.env.DB.prepare(`DELETE FROM appointments WHERE id = ? AND user_id = ?`).bind(appointmentId, user.id).run();
    return c.json({ success: true });
});

export default app;
