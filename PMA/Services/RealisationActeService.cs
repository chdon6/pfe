using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class RealisationActeService
{
    private readonly IUnitOfWork _unitOfWork;

    public RealisationActeService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<RealisationActeModel>> ListAsync()
    {
        var entities = await _unitOfWork.RealisationsActes.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<RealisationActeModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.RealisationsActes.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(RealisationActeModel model)
    {
        var entity = new RealisationActe
        {
            DateRealisation = model.DateRealisation,
            Resultat = model.Resultat,
            Observation = model.Observation,
            Statut = model.Statut,
            ActePmaId = model.ActePmaId,
            UserId = model.UserId
        };

        await _unitOfWork.RealisationsActes.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.RealisationsActes.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.RealisationsActes.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static RealisationActeModel MapToModel(RealisationActe r)
    {
        return new RealisationActeModel
        {
            Id = r.Id,
            DateRealisation = r.DateRealisation,
            Resultat = r.Resultat,
            Observation = r.Observation,
            Statut = r.Statut,
            ActePmaId = r.ActePmaId,
            UserId = r.UserId
        };
    }
}

