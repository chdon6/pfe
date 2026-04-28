using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class ElementBiologiqueService
{
    private readonly IUnitOfWork _unitOfWork;

    public ElementBiologiqueService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ElementBiologiqueModel>> ListAsync()
    {
        var entities = await _unitOfWork.ElementsBiologiques.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<ElementBiologiqueModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.ElementsBiologiques.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(ElementBiologiqueModel model)
    {
        var entity = new ElementBiologique
        {
            TypeElement = model.TypeElement,
            DateCreation = model.DateCreation,
            NumeroTube = model.NumeroTube,
            PatientId = model.PatientId
        };

        await _unitOfWork.ElementsBiologiques.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.ElementsBiologiques.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.ElementsBiologiques.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static ElementBiologiqueModel MapToModel(ElementBiologique e)
    {
        return new ElementBiologiqueModel
        {
            Id = e.Id,
            TypeElement = e.TypeElement,
            DateCreation = e.DateCreation,
            NumeroTube = e.NumeroTube,
            PatientId = e.PatientId
        };
    }
}

