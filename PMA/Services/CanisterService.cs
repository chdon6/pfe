using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class CanisterService
{
    private readonly IUnitOfWork _unitOfWork;

    public CanisterService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CanisterModel>> ListAsync()
    {
        var entities = await _unitOfWork.Canisters.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<CanisterModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Canisters.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(CanisterModel model)
    {
        var entity = new Canister
        {
            Numero = model.Numero,
            BonbonneId = model.BonbonneId
        };

        await _unitOfWork.Canisters.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Canisters.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Canisters.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static CanisterModel MapToModel(Canister c)
    {
        return new CanisterModel
        {
            Id = c.Id,
            Numero = c.Numero,
            BonbonneId = c.BonbonneId
        };
    }
}

