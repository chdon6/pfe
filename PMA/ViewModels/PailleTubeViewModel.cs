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

public class PailleTubeViewModel : INotifyPropertyChanged
{
    private readonly PailleTubeService _service;

    public ObservableCollection<PailleTubeModel> PailleTubes { get; } = new();

    private PailleTubeModel? _selected;
    public PailleTubeModel? SelectedPailleTube
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

    public PailleTubeModel NewPailleTube { get; } = new();

    public AsyncRelayCommand RefreshCommand { get; }
    public AsyncRelayCommand CreateCommand { get; }
    public AsyncRelayCommand DeleteCommand { get; }

    public PailleTubeViewModel(PailleTubeService service)
    {
        _service = service;

        RefreshCommand = new AsyncRelayCommand(LoadAsync, () => !IsBusy);
        CreateCommand = new AsyncRelayCommand(CreateAsync, () => !IsBusy);
        DeleteCommand = new AsyncRelayCommand(DeleteSelectedAsync, () => !IsBusy && SelectedPailleTube is not null);
    }

    public async Task LoadAsync() => await LoadInternalAsync();

    private async Task LoadInternalAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var items = await _service.ListAsync();

            PailleTubes.Clear();
            foreach (var item in items)
                PailleTubes.Add(item);
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

            var id = await _service.CreateAsync(NewPailleTube);
            SelectedPailleTube = new PailleTubeModel
            {
                Id = id,
                CodeBarre = NewPailleTube.CodeBarre,
                TypeContenu = NewPailleTube.TypeContenu,
                CyclePmaId = NewPailleTube.CyclePmaId,
                CanisterId = NewPailleTube.CanisterId,
                Position = NewPailleTube.Position
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
        if (SelectedPailleTube is null)
            return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;

            await _service.DeleteAsync(SelectedPailleTube.Id);
            SelectedPailleTube = null;
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

