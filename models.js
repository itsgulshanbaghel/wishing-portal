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

const Visitor = mongoose.model('Visitor', visitorSchema);
const Event = mongoose.model('Event', eventSchema);
const Website = mongoose.model('Website', websiteSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = { Visitor, Event, Website, Feedback };
