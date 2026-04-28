using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using PMA.Commands;
using PMA.Models;
using PMA.Services;

namespace PMA.ViewModels;

public class PatientViewModel : INotifyPropertyChanged
{
    private readonly IPatientService _patientService;

    public ObservableCollection<PatientModel> Patients { get; } = new();

    private PatientModel? _selectedPatient;
    public PatientModel? SelectedPatient
    {
        get => _selectedPatient;
        set => SetProperty(ref _selectedPatient, value);
    }

    private bool _isBusy;
    public bool IsBusy
    {
        get => _isBusy;
        set => SetProperty(ref _isBusy, value);
    }

    private string? _errorMessage;
    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public PatientCreateModel NewPatient { get; } = new();

    public ICommand RefreshCommand { get; }
    public ICommand CreateCommand { get; }
    public ICommand DeleteCommand { get; }

    public PatientViewModel(IPatientService patientService)
    {
        _patientService = patientService;

        RefreshCommand = new AsyncRelayCommand(LoadPatientsAsync, () => !IsBusy);
        CreateCommand = new AsyncRelayCommand(CreatePatientAsync, () => !IsBusy);
        DeleteCommand = new AsyncRelayCommand(DeleteSelectedAsync, () => !IsBusy && SelectedPatient is not null);
    }

    public async Task LoadAsync()
        => await LoadPatientsAsync();

    private async Task LoadPatientsAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var patients = await _patientService.ListAsync();

            Patients.Clear();
            foreach (var p in patients)
                Patients.Add(p);
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task CreatePatientAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var id = await _patientService.CreateAsync(NewPatient);
            SelectedPatient = new PatientModel
            {
                Id = id,
                Nom = NewPatient.Nom,
                Prenom = NewPatient.Prenom,
                DateNaissance = NewPatient.DateNaissance,
                NumDossier = NewPatient.NumDossier
            };

            // Recharge la liste pour refléter les changements.
            await LoadPatientsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task DeleteSelectedAsync()
    {
        if (SelectedPatient is null)
            return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;

            await _patientService.DeleteAsync(SelectedPatient.Id);

            SelectedPatient = null;
            await LoadPatientsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void SetProperty<T>(ref T backingField, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(backingField, value))
            return;

        backingField = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

