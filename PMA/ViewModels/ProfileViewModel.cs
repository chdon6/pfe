using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using PMA.Commands;
using PMA.Models;
using PMA.Services;

namespace PMA.ViewModels;

public class ProfileViewModel : INotifyPropertyChanged
{
    private readonly ProfileService _profileService;

    public ObservableCollection<ProfileModel> Profiles { get; } = new();

    private ProfileModel? _selectedProfile;
    public ProfileModel? SelectedProfile
    {
        get => _selectedProfile;
        set => SetProperty(ref _selectedProfile, value);
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

    public ProfileModel NewProfile { get; } = new();

    public AsyncRelayCommand RefreshCommand { get; }
    public AsyncRelayCommand CreateCommand { get; }
    public AsyncRelayCommand DeleteCommand { get; }

    public ProfileViewModel(ProfileService profileService)
    {
        _profileService = profileService;

        RefreshCommand = new AsyncRelayCommand(LoadProfilesAsync, () => !IsBusy);
        CreateCommand = new AsyncRelayCommand(CreateProfileAsync, () => !IsBusy);
        DeleteCommand = new AsyncRelayCommand(DeleteSelectedAsync, () => !IsBusy && SelectedProfile is not null);
    }

    public async Task LoadAsync() => await LoadProfilesAsync();

    private async Task LoadProfilesAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var items = await _profileService.ListAsync();

            Profiles.Clear();
            foreach (var item in items)
                Profiles.Add(item);
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

    private async Task CreateProfileAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var id = await _profileService.CreateAsync(NewProfile);
            SelectedProfile = new ProfileModel
            {
                Id = id,
                Libelle = NewProfile.Libelle
            };

            await LoadProfilesAsync();
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
        if (SelectedProfile is null)
            return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;

            await _profileService.DeleteAsync(SelectedProfile.Id);
            SelectedProfile = null;
            await LoadProfilesAsync();
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

