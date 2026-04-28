using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class BonbonneService
{
    private readonly IUnitOfWork _unitOfWork;

    public BonbonneService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<BonbonneModel>> ListAsync()
    {
        var entities = await _unitOfWork.Bonbonnes.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<BonbonneModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Bonbonnes.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(BonbonneModel model)
    {
        var entity = new Bonbonne
        {
            TypeStockage = model.TypeStockage,
            Temperature = model.Temperature
        };

        await _unitOfWork.Bonbonnes.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Bonbonnes.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Bonbonnes.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static BonbonneModel MapToModel(Bonbonne b)
    {
        return new BonbonneModel
        {
            Id = b.Id,
            TypeStockage = b.TypeStockage,
            Temperature = b.Temperature
        };
    }
}

