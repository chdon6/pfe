using PMA.Models;

namespace PMA.Services;

public interface IPatientService
{
    Task<IReadOnlyList<PatientModel>> ListAsync();
    Task<PatientModel?> GetByIdAsync(int id);
    Task<int> CreateAsync(PatientCreateModel model);
    Task<bool> UpdateAsync(PatientModel model);
    Task<bool> DeleteAsync(int id);
}

