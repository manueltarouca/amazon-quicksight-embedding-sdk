// Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {Parameter, ParametersAsObject} from '../../common/types';
import {DashboardExperienceFrame} from './frame/dashboard-experience-frame';
import {
    DashboardContentOptions,
    ExportToolbarOption,
    IDashboardExperience,
    InternalDashboardExperience,
    NavigateToDashboardOptions,
    Sheet,
    TransformedDashboardContentOptions,
    Visual,
    VisualAction,
} from './types';
import {ExperienceType, FrameOptions} from '../base-experience';
import {ControlOptions} from '../control-experience';

import {ExperienceFrameMetadata} from '../../common/embedding-context';
import {BaseExperience} from '@experience/base-experience/base-experience';
import {ChangeEvent, EmbeddingMessageEvent, ResponseMessage} from '@common/events/events';
import {ChangeEventLevel, ChangeEventName, EmbeddingEvents, MessageEventName} from '@common/events/types';

export class DashboardExperience extends BaseExperience<
    DashboardContentOptions,
    InternalDashboardExperience,
    IDashboardExperience,
    TransformedDashboardContentOptions,
    DashboardExperienceFrame
> {
    protected readonly experience;
    protected readonly internalExperience;
    protected readonly experienceFrame;
    protected readonly experienceId: string;

    constructor(
        frameOptions: FrameOptions,
        contentOptions: DashboardContentOptions,
        controlOptions: ControlOptions,
        experienceIdentifiers: Set<string>
    ) {
        super(frameOptions, contentOptions, controlOptions, experienceIdentifiers);

        this.experience = this.extractExperienceFromUrl(frameOptions.url);

        const {experienceIdentifier, internalExperience} = this.getInternalExperienceInfo<
            InternalDashboardExperience,
            IDashboardExperience
        >(this.experience);

        this.internalExperience = internalExperience;
        this.experienceId = experienceIdentifier;

        this.experienceFrame = new DashboardExperienceFrame(
            frameOptions,
            controlOptions,
            contentOptions,
            this.transformDashboardContentOptions(contentOptions),
            internalExperience,
            experienceIdentifier,
            this.interceptMessage
        );
    }

    initiatePrint = async (): Promise<ResponseMessage> => {
        return this.send(new EmbeddingMessageEvent(MessageEventName.INITIATE_PRINT));
    };

    undo = async (): Promise<ResponseMessage> => {
        return this.send(new EmbeddingMessageEvent(MessageEventName.UNDO));
    };

    redo = async (): Promise<ResponseMessage> => {
        return this.send(new EmbeddingMessageEvent(MessageEventName.REDO));
    };

    toggleBookmarksPane = async (): Promise<ResponseMessage> => {
        return this.send(new EmbeddingMessageEvent(MessageEventName.TOGGLE_BOOKMARKS_PANE));
    };

    getParameters = async (): Promise<Parameter[]> => {
        const response = await this.send<Parameter[]>(new EmbeddingMessageEvent(MessageEventName.GET_PARAMETERS));

        return response?.message ?? [];
    };

    getSheets = async (): Promise<Sheet[]> => {
        const response = await this.send<Sheet[]>(new EmbeddingMessageEvent(MessageEventName.GET_SHEETS));

        return response?.message ?? [];
    };

    getVisualActions = async (sheetId: string, visualId: string): Promise<VisualAction[]> => {
        const response = await this.send<VisualAction[]>(
            new EmbeddingMessageEvent(MessageEventName.GET_VISUAL_ACTIONS, {
                SheetId: sheetId,
                VisualId: visualId,
            })
        );

        return response?.message ?? [];
    };

    addVisualActions = async (sheetId: string, visualId: string, actions: VisualAction[]): Promise<ResponseMessage> => {
        return this.send(
            new EmbeddingMessageEvent(MessageEventName.ADD_VISUAL_ACTIONS, {
                SheetId: sheetId,
                VisualId: visualId,
                Actions: actions,
            })
        );
    };

    setVisualActions = async (sheetId: string, visualId: string, actions: VisualAction[]): Promise<ResponseMessage> => {
        return this.send(
            new EmbeddingMessageEvent(MessageEventName.SET_VISUAL_ACTIONS, {
                SheetId: sheetId,
                VisualId: visualId,
                Actions: actions,
            })
        );
    };

    getSelectedSheetId = async (): Promise<string> => {
        const response = await this.send<string>(new EmbeddingMessageEvent(MessageEventName.GET_SELECTED_SHEET_ID));

        return response?.message ?? '';
    };

    setSelectedSheetId = async (sheetId: string): Promise<ResponseMessage> => {
        return this.send(
            new EmbeddingMessageEvent(MessageEventName.SET_SELECTED_SHEET_ID, {
                SheetId: sheetId,
            })
        );
    };

    navigateToDashboard = async (
        dashboardId: string,
        navigateToDashboardOptions?: NavigateToDashboardOptions
    ): Promise<ResponseMessage> => {
        return this.send(
            new EmbeddingMessageEvent(MessageEventName.NAVIGATE_TO_DASHBOARD, {
                DashboardId: dashboardId,
                Parameters: navigateToDashboardOptions?.parameters,
            })
        );
    };

    removeVisualActions = async (
        sheetId: string,
        visualId: string,
        actions: VisualAction[]
    ): Promise<ResponseMessage> => {
        return this.send(
            new EmbeddingMessageEvent(MessageEventName.REMOVE_VISUAL_ACTIONS, {
                SheetId: sheetId,
                VisualId: visualId,
                Actions: actions,
            })
        );
    };

    getSheetVisuals = async (sheetId: string): Promise<Visual[]> => {
        const response = await this.send<Visual[]>(
            new EmbeddingMessageEvent(MessageEventName.GET_SHEET_VISUALS, {
                SheetId: sheetId,
            })
        );

        return response?.message ?? [];
    };

    setParameters = async (parameters: Parameter[]): Promise<ResponseMessage> => {
        return this.send(new EmbeddingMessageEvent(MessageEventName.SET_PARAMETERS, parameters));
    };

    reset = async (): Promise<ResponseMessage> => {
        return this.send(new EmbeddingMessageEvent(MessageEventName.RESET));
    };

    protected extractExperienceFromUrl = (url: string): IDashboardExperience => {
        const matches: Array<string> = /^https:\/\/[^/]+\/embed\/[^/]+\/dashboards\/([\w-]+)(\?|$)/i.exec(url) || [];

        if (matches.length < 3) {
            this.frameOptions.onChange?.(
                new ChangeEvent(
                    ChangeEventName.INVALID_URL,
                    ChangeEventLevel.ERROR,
                    'Invalid dashboard experience url',
                    {
                        url,
                    }
                ),
                {frame: null}
            );

            throw new Error('Invalid dashboard experience URL');
        }

        return {
            experienceType: ExperienceType.DASHBOARD,
            dashboardId: matches[1],
        };
    };

    private interceptMessage = (messageEvent: EmbeddingEvents, metadata?: ExperienceFrameMetadata) => {
        // Intercepting onMessage
        // if the resizeHeightOnSizeChangedEvent is true, upon receiving SIZE_CHANGED message, update the height of the iframe
        if (messageEvent.eventName === 'SIZE_CHANGED' && this.frameOptions.resizeHeightOnSizeChangedEvent) {
            metadata?.frame?.setAttribute?.('height', `${messageEvent?.message?.height}px`);
        }
    };

    // We add content options into the query string of the iframe url.
    // Some option names do not match option names that the static content expects
    // This function converts the property names to the query string parameters that the static content expects
    private transformDashboardContentOptions = (contentOptions: DashboardContentOptions) => {
        const {
            parameters,
            locale,
            attributionOptions,
            sheetOptions,
            toolbarOptions,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            onMessage,
            ...unrecognizedContentOptions
        } = contentOptions;

        const transformedContentOptions = this.transformContentOptions<TransformedDashboardContentOptions>(
            {
                locale,
            },
            unrecognizedContentOptions
        );

        if (Array.isArray(parameters)) {
            transformedContentOptions.parameters = parameters.reduce(
                (parametersAsObject: ParametersAsObject, parameter: Parameter) => {
                    return {
                        ...parametersAsObject,
                        [parameter.Name]: parameter.Values,
                    };
                },
                {}
            );
        }

        if (attributionOptions?.overlayContent !== true) {
            transformedContentOptions.footerPaddingEnabled = true;
        }

        if (toolbarOptions?.export || (toolbarOptions?.export as ExportToolbarOption)?.print) {
            transformedContentOptions.printEnabled = true;
        }

        if (toolbarOptions?.undoRedo !== true) {
            transformedContentOptions.undoRedoDisabled = true;
        }

        if (toolbarOptions?.reset !== true) {
            transformedContentOptions.resetDisabled = true;
        }

        if (toolbarOptions?.bookmarks === true) {
            transformedContentOptions.showBookmarksIcon = true;
        }

        if (sheetOptions?.initialSheetId) {
            transformedContentOptions.sheetId = sheetOptions.initialSheetId;
        }

        if (typeof sheetOptions?.singleSheet === 'boolean') {
            transformedContentOptions.sheetTabsDisabled = sheetOptions.singleSheet;
        }

        if (sheetOptions?.emitSizeChangedEventOnSheetChange) {
            transformedContentOptions.resizeOnSheetChange = true;
        }

        return transformedContentOptions;
    };
}
