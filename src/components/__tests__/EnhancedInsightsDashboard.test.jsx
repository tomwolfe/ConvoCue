import React from 'react';
import { render, screen } from '@testing-library/react';
import EnhancedInsightsDashboard from './EnhancedInsightsDashboard';

// Mock the recharts components since they're not essential for unit tests
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
}));

describe('EnhancedInsightsDashboard', () => {
  const mockSessions = [
    {
      id: '1',
      timestamp: '2023-01-01T10:00:00Z',
      transcript: [
        { speaker: 'me', text: 'Hello, how are you?', intent: 'social' },
        { speaker: 'them', text: 'I am fine, thanks!', intent: 'social' },
        { speaker: 'me', text: 'What did you do this weekend?', intent: 'social' }
      ],
      battery: 75,
      initialBattery: 100,
      stats: {
        totalCount: 3,
        meCount: 2,
        themCount: 1,
        totalDrain: 25
      },
      duration: 300000 // 5 minutes in milliseconds
    },
    {
      id: '2',
      timestamp: '2023-01-02T10:00:00Z',
      transcript: [
        { speaker: 'me', text: 'I disagree with that approach', intent: 'conflict' },
        { speaker: 'them', text: 'Can you explain why?', intent: 'empathy' }
      ],
      battery: 80,
      initialBattery: 100,
      stats: {
        totalCount: 2,
        meCount: 1,
        themCount: 1,
        totalDrain: 20
      },
      duration: 180000 // 3 minutes in milliseconds
    }
  ];

  it('renders without crashing', () => {
    render(<EnhancedInsightsDashboard sessions={[]} />);
    expect(screen.getByText('Conversation Insights Dashboard')).toBeInTheDocument();
  });

  it('displays overall statistics correctly', () => {
    render(<EnhancedInsightsDashboard sessions={mockSessions} />);
    
    // Check that the stats are calculated and displayed
    expect(screen.getByText('2')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('5')).toBeInTheDocument(); // Total messages
  });

  it('shows personalized insights when data is available', () => {
    render(<EnhancedInsightsDashboard sessions={mockSessions} />);
    
    // Should show insights based on the mock data
    const insightsElements = screen.getAllByText(/(High Energy Drain|Improving Pattern|Engaging Conversations)/i);
    expect(insightsElements.length).toBeGreaterThan(0);
  });

  it('handles empty sessions gracefully', () => {
    render(<EnhancedInsightsDashboard sessions={[]} />);
    
    // Should show zero values for stats when no sessions
    expect(screen.getByText('0')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('No specific insights detected yet')).toBeInTheDocument();
  });

  it('renders charts containers', () => {
    render(<EnhancedInsightsDashboard sessions={mockSessions} />);
    
    // Check that chart sections are rendered
    expect(screen.getByText('Intent Distribution')).toBeInTheDocument();
    expect(screen.getByText('Session Trends (Last 10)')).toBeInTheDocument();
    expect(screen.getByText('Battery Levels Over Time')).toBeInTheDocument();
  });
});