using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class PailleTubeService
{
    private readonly IUnitOfWork _unitOfWork;

    public PailleTubeService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<PailleTubeModel>> ListAsync()
    {
        var entities = await _unitOfWork.PailleTubes.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<PailleTubeModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.PailleTubes.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(PailleTubeModel model)
    {
        var entity = new PailleTube
        {
            CodeBarre = model.CodeBarre,
            TypeContenu = model.TypeContenu,
            CyclePmaId = model.CyclePmaId,
            CanisterId = model.CanisterId,
            Position = model.Position
        };

        await _unitOfWork.PailleTubes.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.PailleTubes.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.PailleTubes.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static PailleTubeModel MapToModel(PailleTube p)
    {
        return new PailleTubeModel
        {
            Id = p.Id,
            CodeBarre = p.CodeBarre,
            TypeContenu = p.TypeContenu,
            CyclePmaId = p.CyclePmaId,
            CanisterId = p.CanisterId,
            Position = p.Position
        };
    }
}

