const paginationMeta = (query: Record<string, unknown>, total: number) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  return {
    page,
    limit,
    total,
    totalPage: Math.ceil(total / limit) || 1
  };
};

export default paginationMeta;
