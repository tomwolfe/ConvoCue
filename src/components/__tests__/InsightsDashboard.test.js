import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InsightsDashboard from '../components/InsightsDashboard';

// Mock recharts components since they're not available in test environment
jest.mock('recharts', () => ({
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

  test('renders without crashing', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Conversation Insights')).toBeInTheDocument();
    expect(screen.getByText('Understand your conversation patterns and social energy trends')).toBeInTheDocument();
  });

  test('displays correct stats', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total conversations
    expect(screen.getByText('32.5%')).toBeInTheDocument(); // Avg battery drain
  });

  test('shows dominant intents chart', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  test('shows weekly activity chart', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  test('shows battery trends chart', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  test('shows intent distribution chart', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('shows insights summary', () => {
    render(<InsightsDashboard sessions={mockSessions} />);
    
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
  });
});