jest.mock('pg', () => {
  const query = jest.fn();
  return {
    Pool: jest.fn(() => ({ query })),
    __query: query,
  };
});

const setup = async () => {
  jest.resetModules();
  const mod = await import('../worker');
  const pg = await import('pg');
  return { processEvents: mod.processEvents, query: (pg as any).__query as jest.Mock };
};

describe('enrichment worker', () => {
  it('does nothing when there are no pending events', async () => {
    const { processEvents, query } = await setup();
    query.mockResolvedValueOnce({ rows: [] });

    await processEvents();

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('inserts analysis and marks events as enriched', async () => {
    const { processEvents, query } = await setup();
    query.mockResolvedValueOnce({
      rows: [
        {
          event_id: 'evt-1',
          aggregate_id: 'field-1',
          payload: { field_name: 'Field One', crop_type: 'Corn' },
        },
      ],
    });
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] });

    await processEvents();

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1][0]).toContain('INSERT INTO ai_analysis');
    expect(query.mock.calls[2][0]).toContain('UPDATE events');
  });
});
