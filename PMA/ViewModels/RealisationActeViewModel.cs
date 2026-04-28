using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using PMA.Commands;
using PMA.Models;
using PMA.Services;

namespace PMA.ViewModels;

public class RealisationActeViewModel : INotifyPropertyChanged
{
    private readonly RealisationActeService _service;

    public ObservableCollection<RealisationActeModel> Realisations { get; } = new();

    private RealisationActeModel? _selected;
    public RealisationActeModel? SelectedRealisation
    {
        get => _selected;
        set => SetProperty(ref _selected, value);
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

    public RealisationActeModel NewRealisation { get; } = new();

    public AsyncRelayCommand RefreshCommand { get; }
    public AsyncRelayCommand CreateCommand { get; }
    public AsyncRelayCommand DeleteCommand { get; }

    public RealisationActeViewModel(RealisationActeService service)
    {
        _service = service;

        RefreshCommand = new AsyncRelayCommand(LoadAsync, () => !IsBusy);
        CreateCommand = new AsyncRelayCommand(CreateAsync, () => !IsBusy);
        DeleteCommand = new AsyncRelayCommand(DeleteSelectedAsync, () => !IsBusy && SelectedRealisation is not null);
    }

    public async Task LoadAsync() => await LoadInternalAsync();

    private async Task LoadInternalAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var items = await _service.ListAsync();

            Realisations.Clear();
            foreach (var item in items)
                Realisations.Add(item);
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

    private async Task CreateAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var id = await _service.CreateAsync(NewRealisation);
            SelectedRealisation = new RealisationActeModel
            {
                Id = id,
                DateRealisation = NewRealisation.DateRealisation,
                Resultat = NewRealisation.Resultat,
                Observation = NewRealisation.Observation,
                Statut = NewRealisation.Statut,
                ActePmaId = NewRealisation.ActePmaId,
                UserId = NewRealisation.UserId
            };

            await LoadInternalAsync();
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
        if (SelectedRealisation is null)
            return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;

            await _service.DeleteAsync(SelectedRealisation.Id);
            SelectedRealisation = null;
            await LoadInternalAsync();
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

