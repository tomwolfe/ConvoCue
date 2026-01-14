export const INTENT_PATTERNS = {
    social: {
        keywords: [
            'hello', 'hi', 'how are you', 'nice to meet', 'weather', 'party', 'weekend', 
            'name', 'thanks', 'cool', 'awesome', 'fun', 'plans', 'hobbies', 'family',
            'vacation', 'trip', 'recommend', 'favorite', 'dinner', 'lunch', 'drink'
        ],
        weight: 1
    },
    professional: {
        keywords: [
            'project', 'meeting', 'deadline', 'report', 'client', 'strategy', 'goal', 
            'agenda', 'update', 'feedback', 'workflow', 'resource', 'budget', 'roadmap',
            'stakeholder', 'quarterly', 'deliverable', 'action item', 'sync', 'call',
            'colleague', 'manager', 'director', 'presentation'
        ],
        weight: 1.2
    },
    conflict: {
        keywords: [
            'disagree', 'wrong', 'mistake', 'fail', 'issue', 'problem', 'not true', 
            'actually', 'unacceptable', 'frustrated', 'no way', 'impossible',
            'refuse', 'blame', 'error', 'delay', 'broken', 'unfair', 'uncomfortable',
            'nonsense', 'ridiculous', 'offended', 'annoyed', 'hate', 'stupid', 'stop'
        ],
        weight: 1.5
    },
    empathy: {
        keywords: [
            'understand', 'feel', 'difficult', 'hard', 'support', 'help', 'sorry to hear', 
            'bummer', 'that sucks', 'tough', 'exhausting', 'sorry', 'apologize', 
            'listen', 'there for you', 'hear you', 'valid', 'mean a lot', 'appreciate',
            'supportive', 'kind', 'brave', 'tired', 'drained', 'burned out', 'rough'
        ],
        weight: 1.3
    },
    positive: {
        keywords: [
            'great', 'awesome', 'excellent', 'wonderful', 'cool', 'love', 'happy', 
            'excited', 'good', 'perfect', 'nice', 'thanks', 'thank you', 'appreciate',
            'fantastic', 'brilliant', 'glad', 'celebrate', 'success', 'win'
        ],
        weight: 0.8
    }
};

export const PARETO_PERSONAS = {
    anxiety: {
        label: 'Anxiety Coach',
        icon: 'ShieldAlert',
        drainRate: 1.5,
        description: 'Provides gentle, low-pressure cues that bridge silence or offer easy exits.',
        bestFor: 'Social anxiety, gentle guidance',
        examples: [
            { context: 'SOCIAL', input: 'Hey, how was your weekend?', suggestion: 'It was great, thanks! How about yours?' },
            { context: 'EXHAUSTED', input: 'So what do you think about the new policy?', suggestion: "I'm still processing it. Mind if we chat later?" }
        ],
        prompt: `You are a warm, supportive social coach. 
        GOAL: Provide low-pressure, validating cues. 
        STRATEGY: Use the 80/20 rule—suggest the smallest possible response that maintains social harmony.
        - If SOCIAL: Simple, warm follow-up questions.
        - If CONFLICT: Soften the blow; find one point of agreement.
        - If EXHAUSTED: Provide 100% polite, zero-guilt exit scripts.`
    },
    professional: {
        label: 'Pro Exec',
        icon: 'Briefcase',
        drainRate: 1.0,
        description: 'Focuses on projecting confidence, clarity, and strategic alignment.',
        bestFor: 'Business meetings, direct feedback',
        examples: [
            { context: 'PROFESSIONAL', input: 'The project is behind schedule.', suggestion: 'What are the top three blockers we can resolve now?' },
            { context: 'CONFLICT', input: "I don't think your approach will work.", suggestion: 'I appreciate the feedback. What alternative do you propose?' }
        ],
        prompt: `You are a high-level executive coach. 
        GOAL: Project confidence and strategic alignment. 
        STRATEGY: Focus on 'Next Steps' and 'Action Items'. Keep it under 15 words.
        - If PROFESSIONAL: Ask about blockers or deadlines.
        - If CONFLICT: Acknowledge the tension, then pivot immediately to solutions.
        - If EXHAUSTED: Wrap up with a summary and a clear 'end meeting' signal.`
    },
    relationship: {
        label: 'EQ Coach',
        icon: 'Heart',
        drainRate: 0.8,
        description: 'Focuses on deepening connection, validation, and emotional labeling.',
        bestFor: 'Relationships, emotional support',
        examples: [
            { context: 'EMPATHY', input: 'I had a really rough day at work.', suggestion: "That sounds incredibly draining. I'm here to listen." },
            { context: 'CONFLICT', input: 'You never listen to me!', suggestion: "I hear that you're feeling unheard. Can we try that again?" }
        ],
        prompt: `You are an expert in Emotional Intelligence. 
        GOAL: Deepen connection and validate emotions. 
        STRATEGY: Label the emotion you hear. Use reflective listening.
        - If EMPATHY: "It sounds like you're feeling [EMOTION] because [CONTEXT]."
        - If CONFLICT: De-escalate by validating their feeling, even if you disagree with the fact.
        - If EXHAUSTED: Exit with warmth: "I value this chat but I'm out of steam. Let's resume when I can give you my full attention."`
    },
    crosscultural: {
        label: 'Culture Guide',
        icon: 'Globe',
        drainRate: 1.2,
        description: 'Navigates high/low context differences and helps save face in cross-cultural interactions.',
        bestFor: 'Cross-cultural, diplomatic',
        examples: [
            { context: 'SOCIAL', input: 'Is it okay to talk about politics here?', suggestion: "People usually prefer lighter topics initially. Maybe ask about local food?" },
            { context: 'CONFLICT', input: 'Your team is not following the protocol.', suggestion: 'Could you help me understand the expected workflow better?' }
        ],
        prompt: `You are a cross-cultural communication expert. 
        GOAL: Navigate high/low context differences and 'save face'.
        STRATEGY: Be diplomatic and indirect where appropriate. Avoid 'No'—use 'It might be difficult' instead.
        - If SOCIAL: Suggest inclusive, clear language.
        - If CONFLICT: Use 'help me understand' rather than 'you are wrong'.
        - If EXHAUSTED: Use a socially acceptable time-bound excuse.`
    }
};

export const BRIDGE_PHRASES = {
    social: "That's a good point, let me think...",
    professional: "I see, let me consider the best way to approach that...",
    conflict: "I hear you, let's find the right words here...",
    empathy: "I understand how you feel, give me a moment...",
    positive: "That's great! Let me think of a good follow-up...",
    general: "Thinking of a good response..."
};

export const AppConfig = {
    personas: PARETO_PERSONAS,
    defaultPersona: 'anxiety',
    batteryDeduction: {
        baseRate: 0.1,
        multipliers: {
            social: 0.8,
            professional: 1.2,
            conflict: 2.0,
            empathy: 1.1,
            positive: 0.5,
            general: 1.0
        }
    },
    minBatteryThreshold: 15,
    fatigueFilterThreshold: 40, // Battery level below which filtering becomes more aggressive
    agency: {
        sensitivityOptions: [
            { label: 'Low', value: 0.5 },
            { label: 'Normal', value: 1.0 },
            { label: 'High', value: 1.5 }
        ],
        defaultSensitivity: 1.0
    }
};

export const QUICK_ACTIONS = {
    social: [
        { label: "Tell me more", text: "That's interesting, tell me more about that?" },
        { label: "Good question", text: "That's a great question, let me think about that for a second." },
        { label: "Valid", text: "I totally see what you mean, that makes a lot of sense." }
    ],
    professional: [
        { label: "Next steps?", text: "What do you think are the most important next steps here?" },
        { label: "Confirm", text: "Just to make sure I'm on the same page, you're saying...?" },
        { label: "Goal", text: "What is the primary goal we're trying to achieve with this?" }
    ],
    conflict: [
        { label: "De-escalate", text: "I hear that you're frustrated, and I want to understand your perspective better." },
        { label: "Pause", text: "I think I need a minute to process that before I respond. Can we take a quick break?" },
        { label: "Bridge", text: "We seem to have different views here. How can we find a middle ground?" }
    ],
    empathy: [
        { label: "Support", text: "That sounds really tough. Is there anything I can do to support you right now?" },
        { label: "Validate", text: "It's completely understandable that you feel that way." },
        { label: "Listen", text: "I'm here to listen. Take all the time you need." }
    ],
    exhausted: [
        { label: "Soft Exit", text: "It's been great chatting, but I'm starting to hit a wall. Mind if we wrap this up?" },
        { label: "Hard Exit", text: "I've actually got to head out now, but let's catch up again soon!" },
        { label: "Raincheck", text: "I'm feeling a bit drained right now. Can we continue this conversation another time?" }
    ]
};
