import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CausalForceGraph } from './CausalForceGraph';

vi.mock('@umijs/max', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('react-force-graph-2d', () => ({
  default: () => <div data-testid="force-graph" />,
}));

describe('CausalForceGraph', () => {
  it('shows a legend explaining causal edge colours and line styles', () => {
    render(
      <CausalForceGraph
        data={{
          nodes: [],
          edges: [],
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /线色图例/ })).toBeInTheDocument();
    expect(screen.getByText('正向因果效应')).toBeInTheDocument();
    expect(screen.getByText('负向因果效应')).toBeInTheDocument();
    expect(screen.getByText('无显著效应')).toBeInTheDocument();
    expect(screen.getByText('混合因果符号')).toBeInTheDocument();
    expect(screen.getByText(/虚线表示/)).toBeInTheDocument();
    expect(screen.getByText(/边的粗细代表/)).toBeInTheDocument();
  });

  it('collapses and restores the legend when its title is clicked', () => {
    render(<CausalForceGraph data={{ nodes: [], edges: [] }} />);

    const toggle = screen.getByRole('button', { name: /线色图例/ });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('正向因果效应')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('正向因果效应')).toBeInTheDocument();
  });
});
