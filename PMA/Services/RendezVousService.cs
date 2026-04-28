using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class RendezVousService
{
    private readonly IUnitOfWork _unitOfWork;

    public RendezVousService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<RendezVousModel>> ListAsync()
    {
        var entities = await _unitOfWork.RendezVous.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<RendezVousModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.RendezVous.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(RendezVousModel model)
    {
        var entity = new RendezVous
        {
            DateHeure = model.DateHeure,
            Motif = model.Motif,
            PatientId = model.PatientId
        };

        await _unitOfWork.RendezVous.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.RendezVous.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.RendezVous.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static RendezVousModel MapToModel(RendezVous r)
    {
        return new RendezVousModel
        {
            Id = r.Id,
            DateHeure = r.DateHeure,
            Motif = r.Motif,
            PatientId = r.PatientId
        };
    }
}

