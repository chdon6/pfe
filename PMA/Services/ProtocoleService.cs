using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class ProtocoleService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProtocoleService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ProtocoleModel>> ListAsync()
    {
        var entities = await _unitOfWork.Protocoles.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<ProtocoleModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Protocoles.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(ProtocoleModel model)
    {
        var entity = new Protocole
        {
            Type = model.Type
        };

        await _unitOfWork.Protocoles.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Protocoles.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Protocoles.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static ProtocoleModel MapToModel(Protocole p)
    {
        return new ProtocoleModel
        {
            Id = p.Id,
            Type = p.Type
        };
    }
}

