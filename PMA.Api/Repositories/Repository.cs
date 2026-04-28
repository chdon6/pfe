using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Repositories;

public class Repository<T>(PmaDbContext context) : IRepository<T>
    where T : class
{
    private readonly DbSet<T> _dbSet = context.Set<T>();

    public async Task<T?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);

    public async Task<IReadOnlyList<T>> ListAsync() => await _dbSet.AsNoTracking().ToListAsync();

    public async Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> predicate) =>
        await _dbSet.AsNoTracking().Where(predicate).ToListAsync();

    public async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);

    public Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }
}
