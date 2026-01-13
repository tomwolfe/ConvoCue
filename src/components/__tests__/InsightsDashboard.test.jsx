import React from 'react';
import { render, screen } from '@testing-library/react';
import InsightsDashboard from '../InsightsDashboard';

// Mock the recharts components since they're not available in test environment
jest.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="barchart">{children}</div>,
  Bar: ({ children }) => <div data-testid="bar">{children}</div>,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="cartesiangrid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsivecontainer">{children}</div>,
  PieChart: ({ children }) => <div data-testid="piechart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: ({ children }) => <div data-testid="cell">{children}</div>,
  LineChart: ({ children }) => <div data-testid="linechart">{children}</div>,
  Line: ({ children }) => <div data-testid="line">{children}</div>,
}));

describe('InsightsDashboard', () => {
  const mockSessions = [
    {
      id: '1',
      timestamp: '2023-05-01T10:00:00Z',
      transcript: [
        { text: 'Hello, how are you?', speaker: 'them', intent: 'social', timestamp: '10:00' },
        { text: "I'm doing well, thanks!", speaker: 'me', intent: 'social', timestamp: '10:01' },
        { text: 'What did you do this weekend?', speaker: 'them', intent: 'social', timestamp: '10:02' },
        { text: 'I went hiking with friends.', speaker: 'me', intent: 'social', timestamp: '10:03' },
        { text: 'That sounds fun!', speaker: 'them', intent: 'positive', timestamp: '10:04' },
      ],
      battery: 75,
      initialBattery: 100,
      stats: { totalCount: 5, meCount: 2, themCount: 3, totalDrain: 25 },
      persona: 'anxiety',
      duration: 300000
    },
    {
      id: '2',
      timestamp: '2023-05-02T14:30:00Z',
      transcript: [
        { text: "I'm having trouble with the project", speaker: 'them', intent: 'conflict', timestamp: '14:30' },
        { text: "Let's figure this out together", speaker: 'me', intent: 'empathy', timestamp: '14:31' },
        { text: 'I appreciate your support', speaker: 'them', intent: 'positive', timestamp: '14:32' },
      ],
      battery: 85,
      initialBattery: 100,
      stats: { totalCount: 3, meCount: 1, themCount: 2, totalDrain: 15 },
      persona: 'relationship',
      duration: 180000
    }
  ];

  test('renders without crashing', () => {
    render(<InsightsDashboard sessions={[]} />);
    expect(screen.getByText('Conversation Insights')).toBeInTheDocument();
  });

  test('displays stats grid when sessions exist', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    // Check if stats grid is rendered
    expect(screen.getByText('Total Conversations')).toBeInTheDocument();
    expect(screen.getByText('Avg. Battery Drain')).toBeInTheDocument();
    expect(screen.getByText('Avg. Duration')).toBeInTheDocument();
    expect(screen.getByText('Avg. Messages')).toBeInTheDocument();
  });

  test('calculates and displays correct metrics', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    // Total conversations
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Avg battery drain (should be around 20% for the mock data)
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  test('shows speaker balance section', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Speaking Balance')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Others')).toBeInTheDocument();
  });

  test('displays dominant intents chart', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Dominant Conversation Intents')).toBeInTheDocument();
  });

  test('shows persona usage chart', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Persona Usage')).toBeInTheDocument();
  });

  test('displays conversation themes', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Common Conversation Themes')).toBeInTheDocument();
  });

  test('shows improvement suggestions', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Personalized Improvement Suggestions')).toBeInTheDocument();
  });

  test('handles empty sessions gracefully', () => {
    render(<InsightsDashboard sessions={[]} />);
    
    expect(screen.getByText('No Data Yet')).toBeInTheDocument();
  });
});