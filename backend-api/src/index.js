require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Subdomain'],
  credentials: false,
}));
app.options('*', cors()); // handle pre-flight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth',         require('./routes/auth.routes'));
app.use('/api/v1/patients',     require('./routes/patient.routes'));
app.use('/api/v1/appointments', require('./routes/appointment.routes'));
app.use('/api/v1/doctors',       require('./routes/doctor.routes'));
app.use('/api/v1/consultations',  require('./routes/consultation.routes'));
app.use('/api/v1/medicines',       require('./routes/medicine.routes'));
app.use('/api/v1/prescriptions',   require('./routes/prescription.routes'));
app.use('/api/v1/invoices',        require('./routes/invoice.routes'));
app.use('/api/v1/custom-services', require('./routes/customservice.routes'));
app.use('/api/v1/doctor-fees',     require('./routes/doctorfee.routes'));
app.use('/api/v1/end-of-day',      require('./routes/endofday.routes'));
app.use('/api/v1/reports',         require('./routes/report.routes'));
app.use('/api/v1/settings',        require('./routes/settings.routes'));
app.use('/api/v1/admin',          require('./routes/admin.routes'));
app.use('/api/v1/pharmacy',       require('./routes/pharmacy.routes'));
app.use('/api/v1/lab',            require('./routes/lab.routes'));
app.use('/api/v1/insurance',      require('./routes/insurance.routes'));
app.use('/api/v1/portal',         require('./routes/portal.routes'));
app.use('/api/v1/staff',          require('./routes/staff.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
