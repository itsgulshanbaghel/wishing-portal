const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    visitorId: { type: String, required: true, index: true },
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    ip: String,
    geo: {
        city: String,
        country: String,
        region: String
    }
});

const eventSchema = new mongoose.Schema({
    visitorId: { type: String, required: true, index: true },
    sessionId: String,
    type: { type: String, required: true, index: true }, // pageview, session, event, website-view, etc.
    page: String,
    websiteId: { type: String, index: true },
    eventType: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now, index: true },
    geo: {
        city: String,
        country: String
    }
});

const websiteSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    recipientName: String,
    eventType: String,
    templateName: String,
    createdAt: { type: Date, default: Date.now, index: true },
    views: { type: Number, default: 0 },
    uniqueViewers: [String],
    creatorGeo: {
        city: String,
        country: String
    },
    metadata: mongoose.Schema.Types.Mixed
});

const feedbackSchema = new mongoose.Schema({
    websiteId: String, // Optional, if tied to a specific website
    responses: {
        websiteType: String,
        experience: String,
        customization: String,
        feature: String,
        attractive: String,
        receiver: String,
        performance: String,
        issues: String,
        device: String,
        recommend: String,
        newFeatures: String,
        suggestions: String
    },
    submittedAt: { type: Date, default: Date.now },
    ip: String,
    geo: {
        city: String,
        country: String
    }
});

const healthMetricSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, index: true },
    cpuUsage: Number,
    cpuCores: Number,
    cpuModel: String,
    memoryUsage: Number,
    memoryTotal: Number,
    memoryUsed: Number,
    memoryFree: Number,
    diskUsage: Number,
    diskTotal: Number,
    diskUsed: Number,
    diskFree: Number,
    diskMount: String,
    mongoConnections: Number,
    mongoPoolSize: Number,
    mongoDbSize: Number,
    alertLevel: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    alertDetails: mongoose.Schema.Types.Mixed
});

const customSlugSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    websiteId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

const paymentSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    websiteId: { type: String, required: true, index: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'], default: 'PENDING', index: true },
    cfOrderToken: { type: String },
    cfPaymentId: { type: String },
    cfSignature: { type: String },
    customerDetails: mongoose.Schema.Types.Mixed,
    qrCenterType: { type: String, enum: ['text', 'photo', 'none'], default: 'none' },
    qrCenterText: { type: String },
    qrCenterPhotoUrl: { type: String },
    paymentLink: { type: String },
    gateway: { type: String, enum: ['cashfree', 'paypal', 'free_premium_claim', 'localhost'], default: 'cashfree', index: true },
    paypalOrderId: { type: String },
    paypalCaptureId: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
    paidAt: { type: Date },
    metadata: mongoose.Schema.Types.Mixed
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const Event = mongoose.model('Event', eventSchema);
const Website = mongoose.model('Website', websiteSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const HealthMetric = mongoose.model('HealthMetric', healthMetricSchema);
const CustomSlug = mongoose.model('CustomSlug', customSlugSchema);
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Visitor, Event, Website, Feedback, HealthMetric, CustomSlug, Payment };
