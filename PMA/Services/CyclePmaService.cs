using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class CyclePmaService
{
    private readonly IUnitOfWork _unitOfWork;

    public CyclePmaService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CyclePmaModel>> ListAsync()
    {
        var entities = await _unitOfWork.CyclesPma.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<CyclePmaModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.CyclesPma.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(CyclePmaModel model)
    {
        var entity = new CyclePma
        {
            Phase = model.Phase,
            PatientId = model.PatientId,
            ProtocoleId = model.ProtocoleId
        };

        await _unitOfWork.CyclesPma.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.CyclesPma.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.CyclesPma.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static CyclePmaModel MapToModel(CyclePma c)
    {
        return new CyclePmaModel
        {
            Id = c.Id,
            Phase = c.Phase,
            PatientId = c.PatientId,
            ProtocoleId = c.ProtocoleId
        };
    }
}

