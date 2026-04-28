using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class ConsentementService
{
    private readonly IUnitOfWork _unitOfWork;

    public ConsentementService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ConsentementModel>> ListAsync()
    {
        var entities = await _unitOfWork.Consentements.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<ConsentementModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Consentements.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(ConsentementModel model)
    {
        var entity = new Consentement
        {
            Type = model.Type,
            DateSignature = model.DateSignature,
            PatientId = model.PatientId,
            PhotoPath = model.PhotoPath,
            CinHommePath = model.CinHommePath,
            CinFemmePath = model.CinFemmePath,
            ContratMariagePath = model.ContratMariagePath
        };

        await _unitOfWork.Consentements.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Consentements.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Consentements.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static ConsentementModel MapToModel(Consentement c)
    {
        return new ConsentementModel
        {
            Id = c.Id,
            Type = c.Type,
            DateSignature = c.DateSignature,
            PatientId = c.PatientId,
            PhotoPath = c.PhotoPath,
            CinHommePath = c.CinHommePath,
            CinFemmePath = c.CinFemmePath,
            ContratMariagePath = c.ContratMariagePath
        };
    }
}

