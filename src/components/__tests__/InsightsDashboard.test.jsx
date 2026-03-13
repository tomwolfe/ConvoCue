import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightsDashboard from '../InsightsDashboard';

// Mock recharts components since they're not available in test environment
vi.mock('recharts', () => ({
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ children }) => <div data-testid="bar">{children}</div>,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }) => <div data-testid="pie">{children}</div>,
    Cell: ({ children }) => <div data-testid="cell">{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />
}));

describe('InsightsDashboard', () => {
    const mockSessions = [
        {
            id: '1',
            timestamp: '2023-01-01T10:00:00Z',
            transcript: [
                { speaker: 'me', text: 'Hello', intent: 'social', timestamp: '10:00' },
                { speaker: 'them', text: 'Hi there', intent: 'social', timestamp: '10:01' },
                { speaker: 'me', text: 'How are you?', intent: 'social', timestamp: '10:02' },
            ],
            battery: 75,
            initialBattery: 100,
            stats: { totalCount: 3, meCount: 2, themCount: 1, totalDrain: 25 },
            duration: 120000
        },
        {
            id: '2',
            timestamp: '2023-01-02T10:00:00Z',
            transcript: [
                { speaker: 'me', text: 'This is a conflict', intent: 'conflict', timestamp: '10:00' },
                { speaker: 'them', text: 'I disagree', intent: 'conflict', timestamp: '10:01' },
            ],
            battery: 60,
            initialBattery: 100,
            stats: { totalCount: 2, meCount: 1, themCount: 1, totalDrain: 40 },
            duration: 180000
        }
    ];

    it('renders without crashing', () => {
        render(<InsightsDashboard sessions={mockSessions} />);

        expect(screen.getByText('Conversation Insights')).toBeInTheDocument();
        expect(screen.getByText('Understand your conversation patterns and social energy trends')).toBeInTheDocument();
    });

    it('displays correct stats', () => {
        render(<InsightsDashboard sessions={mockSessions} />);

        expect(screen.getByText('2')).toBeInTheDocument(); // Total conversations
        expect(screen.getByText('32.5%')).toBeInTheDocument(); // Avg battery drain
    });

    it('shows dominant intents chart', () => {
        const { container } = render(<InsightsDashboard sessions={mockSessions} />);
        
        // Check for the chart section by looking for the specific heading
        const headings = Array.from(container.querySelectorAll('h3'));
        const hasDominantIntents = headings.some(h => /Dominant|Intent/i.test(h.textContent));
        expect(hasDominantIntents).toBe(true);
    });

    it('shows weekly activity chart', () => {
        const { container } = render(<InsightsDashboard sessions={mockSessions} />);
        
        const headings = Array.from(container.querySelectorAll('h3'));
        const hasWeeklyActivity = headings.some(h => /Weekly|Activity/i.test(h.textContent));
        expect(hasWeeklyActivity).toBe(true);
    });

    it('shows battery trends chart', () => {
        const { container } = render(<InsightsDashboard sessions={mockSessions} />);
        
        const headings = Array.from(container.querySelectorAll('h3'));
        const hasBatteryTrends = headings.some(h => /Battery|Trend/i.test(h.textContent));
        expect(hasBatteryTrends).toBe(true);
    });

    it('shows intent distribution chart', () => {
        const { container } = render(<InsightsDashboard sessions={mockSessions} />);
        
        const headings = Array.from(container.querySelectorAll('h3'));
        const hasDistribution = headings.some(h => /Distribution/i.test(h.textContent));
        expect(hasDistribution).toBe(true);
    });

    it('shows insights summary', () => {
        render(<InsightsDashboard sessions={mockSessions} />);

        expect(screen.getByText('Key Insights')).toBeInTheDocument();
    });
});
