# Intent Taxonomy Documentation

## Overview
This document explains the rationale behind each intent category in ConvoCue's real-time intent detection system. Understanding these categories helps users customize their experience and helps developers maintain and extend the system.

## Intent Categories

### 1. Social (`social`)
**Purpose**: Detects greetings, affirmations, acknowledgments, and social engagement cues.
**Rationale**: Social interactions form the foundation of most conversations. Identifying these cues helps the system recognize when to provide etiquette tips, connection-building suggestions, or appropriate social responses.
**Examples**: "Hello", "Hi", "Good morning", "Yes", "Absolutely", "I agree", "Everyone", "What do you think?"

### 2. Question (`question`)
**Purpose**: Identifies inquiries, requests for clarification, and follow-up prompts.
**Rationale**: Questions drive conversation forward and signal opportunities for engagement. Recognizing questions helps the system provide more detailed, informative responses and suggest follow-up strategies.
**Examples**: "How?", "Why?", "What do you think?", "Can you explain?", "Tell me more", "What are your thoughts?"

### 3. Conflict (`conflict`)
**Purpose**: Detects disagreements, tensions, problems, and negative sentiments.
**Rationale**: Early identification of conflict enables de-escalation strategies and helps the system provide diplomatic, empathetic responses that defuse tension and promote constructive dialogue.
**Examples**: "Wrong", "Disagree", "Problem", "Issue", "Stop", "Wait", "I don't think so", "That's incorrect"

### 4. Strategic (`strategic`)
**Purpose**: Identifies business discussions, planning, negotiations, and long-term thinking.
**Rationale**: Strategic conversations require different communication approaches than casual ones. This intent helps the system provide professional, goal-oriented suggestions and highlight important business considerations.
**Examples**: "Negotiate", "Priority", "Contract", "Strategy", "Investment", "Director", "Urgent", "Vision", "Goal"

### 5. Action (`action`)
**Purpose**: Recognizes suggestions, recommendations, tasks, and actionable items.
**Rationale**: Action-oriented statements often require follow-through. Identifying these helps the system suggest ways to structure action items, recommend next steps, or highlight commitments.
**Examples**: "We should", "Let's", "Follow up", "Schedule", "Maybe", "Perhaps", "Try", "Consider", "Recommend"

### 6. Empathy (`empathy`)
**Purpose**: Detects emotional support, validation, understanding, and compassionate responses.
**Rationale**: Empathetic moments are crucial for building rapport and trust. Recognizing these helps the system reinforce supportive communication patterns and suggest appropriate emotional responses.
**Examples**: "I understand", "That sounds difficult", "I feel", "I think", "Sorry to hear", "Support", "Feelings", "Emotions"

### 7. Language (`language`)
**Purpose**: Identifies concerns about phrasing, clarity, grammar, and linguistic precision.
**Rationale**: Language-focused moments indicate opportunities to improve communication effectiveness. This intent helps the system provide phrasing suggestions, clarity improvements, and linguistic guidance.
**Examples**: "Unclear", "Explain", "Grammar", "Better way to say", "Phrasing", "Vocabulary", "Meaning", "Clarify"

## Design Principles

### Distinct Boundaries
Each intent category is designed with clear boundaries to minimize overlap:
- **Social vs. Empathy**: Social covers general pleasantries and acknowledgment, while Empathy addresses deeper emotional support.
- **Question vs. Language**: Questions seek information, while Language focuses on how information is expressed.
- **Action vs. Strategic**: Actions are immediate tasks, while Strategic refers to long-term planning and business contexts.

### Hierarchical Relationships
Some intents may co-occur, but the system prioritizes the most specific intent:
- A strategic question would primarily be tagged as `strategic` with secondary consideration for `question`
- An empathetic action (like offering help) would primarily be `empathy` with secondary `action` characteristics

### Context Sensitivity
The system considers context to disambiguate similar phrases:
- "I'm sorry" in "I'm sorry to hear about your loss" → `empathy`
- "I'm sorry but that won't work" → `conflict`
- "I'm sorry for the delay" → `social` (acknowledgment)

## Extending the Taxonomy

New intents should be added when:
1. A significant communication pattern emerges that doesn't fit existing categories
2. User feedback indicates a need for specific coaching in an area not covered
3. The new intent has clear, distinguishable triggers and coaching applications

Before adding new intents, consider whether refinement of existing categories might be more appropriate than expansion.

## Disambiguation Rules

The system uses several rules to handle ambiguous cases:

### Context-Sensitive Disambiguation
- **"I'm sorry"**: Context determines intent
  - "I'm sorry to hear about your loss" → `empathy`
  - "I'm sorry but that won't work" → `conflict`
  - "I'm sorry for the delay" → `social`

### Priority Hierarchy
When multiple intents could apply, the system follows this priority:
1. More specific intent over general intent
2. `conflict` takes precedence when tension is detected
3. `empathy` over `social` for emotional content
4. `strategic` over `social` in business contexts

### Confidence Thresholds
- Default confidence threshold: 0.4
- High-performance mode uses threshold: 0.5
- Configurable via Intent Detection Settings

## Implementation Guidelines

### Adding New Intents
To add a new intent:
1. Define the intent in `src/utils/intentRecognition.js`
2. Add corresponding styling in `src/App.css`
3. Update `TAG_METADATA` in the same file
4. Add UI components for the new intent
5. Update documentation in this file

### Performance Considerations
- Limit similarity checks to first 10 tokens for performance
- Use exact token matching as the primary method
- Reserve similarity matching for edge cases only
- Consider memory usage on low-end devices