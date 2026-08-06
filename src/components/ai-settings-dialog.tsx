'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type JSX, useEffect, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getAiSettings,
  updateAiSettings,
  type AiEndpointSuggestion,
  type FormAiSettings,
} from '@/api/ai.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AiSettingsFormState {
  baseUrl: string;
  model: string;
  apiKey: string;
  jsonObject: boolean;
  formError: string | null;
}

type AiSettingsFormAction =
  | { type: 'hydrated'; data: FormAiSettings }
  | {
      type: 'fieldChanged';
      field: 'baseUrl' | 'model' | 'apiKey';
      value: string;
    }
  | { type: 'jsonObjectChanged'; value: boolean }
  | { type: 'suggestionApplied'; suggestion: AiEndpointSuggestion }
  | { type: 'formErrorSet'; error: string | null };

const initialFormState: AiSettingsFormState = {
  baseUrl: '',
  model: '',
  apiKey: '',
  jsonObject: true,
  formError: null,
};

function aiSettingsFormReducer(
  state: AiSettingsFormState,
  action: AiSettingsFormAction,
): AiSettingsFormState {
  switch (action.type) {
    case 'hydrated': {
      return {
        baseUrl: action.data.baseUrl ?? '',
        model: action.data.model ?? '',
        apiKey: '',
        jsonObject: action.data.jsonObject ?? true,
        formError: null,
      };
    }
    case 'fieldChanged': {
      return { ...state, [action.field]: action.value };
    }
    case 'jsonObjectChanged': {
      return { ...state, jsonObject: action.value };
    }
    case 'suggestionApplied': {
      return {
        ...state,
        baseUrl: action.suggestion.baseUrl,
        model: action.suggestion.defaultModel,
        jsonObject: action.suggestion.jsonObject,
      };
    }
    case 'formErrorSet': {
      return { ...state, formError: action.error };
    }
    default: {
      return state;
    }
  }
}

export function AiSettingsDialog({
  open,
  onOpenChange,
}: AiSettingsDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(aiSettingsFormReducer, initialFormState);

  const settingsQuery = useQuery({
    queryKey: ['ai', 'settings'],
    queryFn: getAiSettings,
    enabled: open,
  });

  useEffect(() => {
    if (!open || !settingsQuery.data) {
      return;
    }
    dispatch({ type: 'hydrated', data: settingsQuery.data });
  }, [open, settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateAiSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      dispatch({
        type: 'formErrorSet',
        error: error.message || t('settings.ai.saveError'),
      });
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    dispatch({ type: 'formErrorSet', error: null });

    const trimmedBase = form.baseUrl.trim();
    const trimmedModel = form.model.trim();
    if (!trimmedBase) {
      dispatch({
        type: 'formErrorSet',
        error: t('settings.ai.baseUrlRequired'),
      });
      return;
    }
    if (!trimmedModel) {
      dispatch({
        type: 'formErrorSet',
        error: t('settings.ai.modelRequired'),
      });
      return;
    }

    const hasExistingKey = settingsQuery.data?.apiKeyConfigured === true;
    const trimmedKey = form.apiKey.trim();
    if (!trimmedKey && !hasExistingKey) {
      dispatch({
        type: 'formErrorSet',
        error: t('settings.ai.apiKeyRequired'),
      });
      return;
    }

    saveMutation.mutate({
      baseUrl: trimmedBase,
      model: trimmedModel,
      jsonObject: form.jsonObject,
      ...(trimmedKey ? { apiKey: trimmedKey } : {}),
    });
  }

  const masked = settingsQuery.data?.apiKeyMasked;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('settings.ai.title')}</DialogTitle>
          <DialogDescription>{t('settings.ai.description')}</DialogDescription>
        </DialogHeader>

        <form
          className='grid gap-4'
          onSubmit={handleSubmit}
        >
          {settingsQuery.data?.suggestions &&
          settingsQuery.data.suggestions.length > 0 ? (
            <div className='grid gap-2'>
              <Label>{t('settings.ai.suggestions')}</Label>
              <div className='flex flex-wrap gap-1.5'>
                {settingsQuery.data.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs'
                    onClick={() => {
                      dispatch({ type: 'suggestionApplied', suggestion });
                    }}
                  >
                    {suggestion.label}
                  </Button>
                ))}
              </div>
              <p className='text-xs text-muted-foreground'>
                {t('settings.ai.suggestionsHint')}
              </p>
            </div>
          ) : null}

          <div className='grid gap-2'>
            <Label htmlFor='ai-base-url'>{t('settings.ai.baseUrl')}</Label>
            <Input
              id='ai-base-url'
              value={form.baseUrl}
              onChange={(event) => {
                dispatch({
                  type: 'fieldChanged',
                  field: 'baseUrl',
                  value: event.target.value,
                });
              }}
              placeholder='https://api.openai.com/v1'
              autoComplete='off'
              spellCheck={false}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='ai-api-key'>{t('settings.ai.apiKey')}</Label>
            <Input
              id='ai-api-key'
              type='password'
              value={form.apiKey}
              onChange={(event) => {
                dispatch({
                  type: 'fieldChanged',
                  field: 'apiKey',
                  value: event.target.value,
                });
              }}
              placeholder={
                masked
                  ? t('settings.ai.apiKeyKeep', { masked })
                  : t('settings.ai.apiKeyPlaceholder')
              }
              autoComplete='off'
              spellCheck={false}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='ai-model'>{t('settings.ai.model')}</Label>
            <Input
              id='ai-model'
              value={form.model}
              onChange={(event) => {
                dispatch({
                  type: 'fieldChanged',
                  field: 'model',
                  value: event.target.value,
                });
              }}
              placeholder='gpt-4o-mini'
              autoComplete='off'
              spellCheck={false}
            />
          </div>

          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <Label htmlFor='ai-json-object'>
                {t('settings.ai.jsonObject')}
              </Label>
              <p className='text-xs text-muted-foreground'>
                {t('settings.ai.jsonObjectHint')}
              </p>
            </div>
            <Switch
              id='ai-json-object'
              checked={form.jsonObject}
              onCheckedChange={(value) => {
                dispatch({ type: 'jsonObjectChanged', value });
              }}
            />
          </div>

          {form.formError ? (
            <p
              className='text-sm text-destructive'
              role='alert'
            >
              {form.formError}
            </p>
          ) : null}

          <DialogFooter className='mx-0 mb-0 rounded-none border-0 bg-transparent p-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('actions.close')}
            </Button>
            <Button
              type='submit'
              disabled={saveMutation.isPending || settingsQuery.isLoading}
            >
              {saveMutation.isPending
                ? t('settings.ai.saving')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
