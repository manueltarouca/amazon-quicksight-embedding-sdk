import {ExperienceType, FrameOptions} from '@experience/base-experience/types';
import {VisualContentOptions} from '@experience/visual-experience/types';
import {ControlOptions} from '@experience/control-experience/types';
import {EventManager} from '@common/event-manager/event-manager';
import {ChangeEventLevel, ChangeEventName, MessageEventName} from '@common/events/types';
import {VisualExperience} from '@experience/visual-experience/visual-experience';
import {ControlExperience} from '@experience/control-experience/control-experience';
import {InfoMessageEventName} from '@common/events/messages';

describe('VisualExperience', () => {
    let TEST_CONTAINER: HTMLElement;
    const TEST_DASHBOARD_ID = 'testDashboardId';
    const TEST_SHEET_ID = 'testSheetId';
    const TEST_VISUAL_ID = 'testVisualId';
    const TEST_CONTEXT_ID = 'testContextId';
    const TEST_GUID = 'testGuid';
    const TEST_VISUAL_URL = `https://test.amazon.com/embed/guid/dashboards/${TEST_DASHBOARD_ID}/sheets/${TEST_SHEET_ID}/visuals/${TEST_VISUAL_ID}`;
    const TEST_OTHER_URL = `https://test.amazon.com/embed/guid/dashboards/${TEST_DASHBOARD_ID}`;
    const TEST_INTERNAL_EXPERIENCE = {
        experienceType: ExperienceType.VISUAL,
        dashboardId: TEST_DASHBOARD_ID,
        sheetId: TEST_SHEET_ID,
        visualId: TEST_VISUAL_ID,
        contextId: TEST_CONTEXT_ID,
        discriminator: 0,
    };
    const TEST_UNRECOGNIZED_CONTENT_OPTION = 'testUnrecognizedContentOption';

    const onChangeSpy = jest.fn();

    let TEST_CONTROL_OPTIONS: ControlOptions;

    beforeAll(() => {
        const eventManager = new EventManager();

        TEST_CONTROL_OPTIONS = {
            eventManager,
            contextId: TEST_CONTEXT_ID,
            urlInfo: {
                sessionId: '1234',
                host: 'https://localhost.com',
            },
        };
    });

    beforeEach(() => {
        TEST_CONTAINER = window.document.createElement('div');
    });

    afterEach(() => {
        onChangeSpy.mockRestore();
    });

    it('should create visual experience', () => {
        const frameOptions = {
            url: TEST_VISUAL_URL,
            container: TEST_CONTAINER,
            width: '800px',
            onChange: onChangeSpy,
        };

        const contentOptions = {
            fitToIframeWidth: true,
        };

        const visualExperience = new VisualExperience(
            frameOptions,
            contentOptions,
            TEST_CONTROL_OPTIONS,
            new Set<string>()
        );

        expect(typeof visualExperience.send).toEqual('function');
        expect(typeof visualExperience.setParameters).toEqual('function');
        expect(onChangeSpy).toHaveBeenCalledWith(
            {
                eventName: ChangeEventName.FRAME_STARTED,
                eventLevel: ChangeEventLevel.INFO,
                message: 'Creating the frame',
                data: {
                    experience: TEST_INTERNAL_EXPERIENCE,
                },
            },
            {frame: null}
        );

        const iFrame = TEST_CONTAINER.querySelector('iframe');
        expect(iFrame).toBeDefined();
    });

    it('should create visual experience and format experience URL', () => {
        const frameOptions = {
            url: `${TEST_VISUAL_URL}?test=test`,
            container: TEST_CONTAINER,
            width: '800px',
            onChange: onChangeSpy,
        };

        const contentOptions = {
            fitToIframeWidth: true,
        };

        const visualExperience = new VisualExperience(
            frameOptions,
            contentOptions,
            TEST_CONTROL_OPTIONS,
            new Set<string>()
        );

        expect(typeof visualExperience.send).toEqual('function');
        expect(typeof visualExperience.setParameters).toEqual('function');
        expect(onChangeSpy).toHaveBeenCalledWith(
            {
                eventName: ChangeEventName.FRAME_STARTED,
                eventLevel: ChangeEventLevel.INFO,
                message: 'Creating the frame',
                data: {
                    experience: TEST_INTERNAL_EXPERIENCE,
                },
            },
            {frame: null}
        );

        const iFrame = TEST_CONTAINER.querySelector('iframe');
        expect(iFrame).toBeDefined();

        expect(iFrame?.src).toEqual(
            'https://test.amazon.com/embed/guid/dashboards/testDashboardId/sheets/testSheetId/visuals/testVisualId?test=test&punyCodeEmbedOrigin=http%3A%2F%2Flocalhost%2F-&fitToIframeWidth=true&contextId=testContextId&discriminator=0#'
        );
    });

    it('should create visual experience and transform parameters', () => {
        const frameOptions = {
            url: TEST_VISUAL_URL,
            container: TEST_CONTAINER,
            width: '800px',
            onChange: onChangeSpy,
        };

        const contentOptions: VisualContentOptions = {
            fitToIframeWidth: true,
            parameters: [
                {
                    Name: 'State',
                    Values: ['CT'],
                },
            ],
            onMessage: jest.fn(),
        };

        const visualExperience = new VisualExperience(
            frameOptions,
            contentOptions,
            TEST_CONTROL_OPTIONS,
            new Set<string>()
        );

        expect(typeof visualExperience.send).toEqual('function');
        expect(typeof visualExperience.setParameters).toEqual('function');
        expect(onChangeSpy).toHaveBeenCalledWith(
            {
                eventName: ChangeEventName.FRAME_STARTED,
                eventLevel: ChangeEventLevel.INFO,
                message: 'Creating the frame',
                data: {
                    experience: TEST_INTERNAL_EXPERIENCE,
                },
            },
            {frame: null}
        );

        const iFrame = TEST_CONTAINER.querySelector('iframe');
        expect(iFrame).toBeDefined();

        expect(iFrame?.src).toEqual(
            'https://test.amazon.com/embed/guid/dashboards/testDashboardId/sheets/testSheetId/visuals/testVisualId?punyCodeEmbedOrigin=http%3A%2F%2Flocalhost%2F-&fitToIframeWidth=true&contextId=testContextId&discriminator=0#p.State=CT'
        );
    });

    it('should throw error if no url', () => {
        const frameOptions = {
            url: undefined,
            container: TEST_CONTAINER,
            width: '800px',
        };
        const contentOptions = {
            fitToIframeWidth: true,
        };
        const createVisualFrameWrapper = () => {
            new VisualExperience(
                // @ts-expect-error - Validate that error is thrown when URL is omitted from frameOptions
                frameOptions,
                contentOptions,
                TEST_CONTROL_OPTIONS,
                new Set<string>()
            );
        };

        expect(createVisualFrameWrapper).toThrowError('Url is required for the experience');
    });

    it('should throw error if not visual url', () => {
        const frameOptions = {
            url: TEST_OTHER_URL,
            container: TEST_CONTAINER,
            width: '800px',
        };

        const contentOptions = {
            fitToIframeWidth: true,
        };

        const createVisualFrameWrapper = () => {
            new VisualExperience(frameOptions, contentOptions, TEST_CONTROL_OPTIONS, new Set<string>());
        };

        expect(createVisualFrameWrapper).toThrowError('Invalid visual experience URL');
    });

    it('should emit warning if with unrecognized content options', () => {
        const frameOptions = {
            url: TEST_VISUAL_URL,
            container: TEST_CONTAINER,
            width: '800px',
            onChange: onChangeSpy,
        };
        const contentOptions = {
            [TEST_UNRECOGNIZED_CONTENT_OPTION]: 'some value',
        };

        const visualExperience = new VisualExperience(
            frameOptions,
            // @ts-expect-error - Validate that warning is emitted for invalid content option
            contentOptions,
            TEST_CONTROL_OPTIONS,
            new Set<string>()
        );
        expect(typeof visualExperience.send).toEqual('function');
        expect(typeof visualExperience.setParameters).toEqual('function');
        expect(onChangeSpy).toHaveBeenCalledWith(
            {
                eventName: ChangeEventName.UNRECOGNIZED_CONTENT_OPTIONS,
                eventLevel: ChangeEventLevel.WARN,
                message: 'Experience content options contain unrecognized properties',
                data: {
                    unrecognizedContentOptions: [TEST_UNRECOGNIZED_CONTENT_OPTION],
                },
            },
            {frame: null}
        );
    });

    describe('Events', () => {
        let controlExperience: ControlExperience;

        beforeEach(() => {
            const body = window.document.querySelector('body');

            if (body) {
                controlExperience = new ControlExperience(body, TEST_CONTROL_OPTIONS);
            }
        });

        it('should resize iframe when resizeHeightOnSizeChangedEvent is enabled', async () => {
            const frameOptions: FrameOptions = {
                url: TEST_VISUAL_URL,
                container: TEST_CONTAINER,
                width: '800px',
                onChange: onChangeSpy,
                resizeHeightOnSizeChangedEvent: true,
            };

            const contentOptions: VisualContentOptions = {
                fitToIframeWidth: true,
                parameters: [
                    {
                        Name: 'State',
                        Values: ['CT'],
                    },
                ],
            };

            const visualExperience = new VisualExperience(
                frameOptions,
                contentOptions,
                TEST_CONTROL_OPTIONS,
                new Set<string>()
            );

            expect(typeof visualExperience.send).toEqual('function');
            expect(typeof visualExperience.setParameters).toEqual('function');
            expect(onChangeSpy).toHaveBeenCalledWith(
                {
                    eventName: ChangeEventName.FRAME_STARTED,
                    eventLevel: ChangeEventLevel.INFO,
                    message: 'Creating the frame',
                    data: {
                        experience: TEST_INTERNAL_EXPERIENCE,
                    },
                },
                {frame: null}
            );

            const iframe = TEST_CONTAINER.querySelector('iframe');
            expect(iframe).toBeDefined();
            expect(iframe?.src).toEqual(
                'https://test.amazon.com/embed/guid/dashboards/testDashboardId/sheets/testSheetId/visuals/testVisualId?punyCodeEmbedOrigin=http%3A%2F%2Flocalhost%2F-&fitToIframeWidth=true&contextId=testContextId&discriminator=0#p.State=CT'
            );

            expect(iframe?.height).toEqual('0px');

            controlExperience.controlFrameMessageListener(
                new MessageEvent('message', {
                    data: {
                        eventTarget: TEST_INTERNAL_EXPERIENCE,
                        eventName: InfoMessageEventName.SIZE_CHANGED,
                        message: {
                            height: '500',
                        },
                    },
                })
            );

            expect(iframe?.height).toEqual('500px');
        });
    });

    describe('Actions', () => {
        let visualExperience: VisualExperience;
        const mockSend = jest.fn();
        const ACTIONS_TEST_CONTAINER = window.document.createElement('div');
        const frameOptions = {
            url: TEST_VISUAL_URL,
            container: ACTIONS_TEST_CONTAINER,
            width: '800px',
            onChange: onChangeSpy,
        };

        beforeEach(() => {
            visualExperience = new VisualExperience(frameOptions, {}, TEST_CONTROL_OPTIONS, new Set<string>());

            ACTIONS_TEST_CONTAINER.querySelector('iframe')?.dispatchEvent(new Event('load'));

            jest.spyOn(visualExperience, 'send').mockImplementation(mockSend);
        });

        it('should emit ADD_VISUAL_ACTIONS event when addVisualActions is called', () => {
            visualExperience.addActions([
                {
                    CustomActionId: TEST_GUID,
                    ActionOperations: [{CallbackOperation: {EmbeddingMessage: {}}}],
                    Status: 'ENABLED',
                    Name: 'Custom-Action',
                    Trigger: 'DATA_POINT_CLICK',
                },
            ]);

            expect(visualExperience.send).toBeCalledWith(
                expect.objectContaining({
                    eventName: MessageEventName.ADD_VISUAL_ACTIONS,
                })
            );
        });

        it('should emit SET_VISUAL_ACTIONS event when setVisualActions is called', () => {
            visualExperience.setActions([
                {
                    CustomActionId: TEST_GUID,
                    ActionOperations: [{CallbackOperation: {EmbeddingMessage: {}}}],
                    Status: 'ENABLED',
                    Name: 'Custom-Action',
                    Trigger: 'DATA_POINT_CLICK',
                },
            ]);

            expect(visualExperience.send).toBeCalledWith(
                expect.objectContaining({
                    eventName: MessageEventName.SET_VISUAL_ACTIONS,
                })
            );
        });

        it('should emit GET_VISUAL_ACTIONS event when getVisualActions is called and return empty list if message is undefined', async () => {
            mockSend.mockResolvedValue(undefined);
            const val = await visualExperience.getActions();

            expect(visualExperience.send).toBeCalledWith(
                expect.objectContaining({
                    eventName: MessageEventName.GET_VISUAL_ACTIONS,
                })
            );

            expect(val).toEqual([]);
        });

        it('should emit REMOVE_VISUAL_ACTIONS event when removeVisualActions is called', () => {
            visualExperience.removeActions([
                {
                    CustomActionId: TEST_GUID,
                    ActionOperations: [{CallbackOperation: {EmbeddingMessage: {}}}],
                    Status: 'ENABLED',
                    Name: 'Custom-Action',
                    Trigger: 'DATA_POINT_CLICK',
                },
            ]);

            expect(visualExperience.send).toBeCalledWith(
                expect.objectContaining({
                    eventName: MessageEventName.REMOVE_VISUAL_ACTIONS,
                })
            );
        });

        it('should emit RESET event when reset action is called', () => {
            visualExperience.reset();

            expect(visualExperience.send).toBeCalledWith({
                eventName: MessageEventName.RESET,
            });
        });

        it('should emit SET_PARAMETER event with new parameters when setParameter action is called', () => {
            const params = [{Values: ['CT'], Name: 'State'}];
            visualExperience.setParameters(params);

            expect(visualExperience.send).toBeCalledWith({
                eventName: MessageEventName.SET_PARAMETERS,
                message: params,
            });
        });
    });
});
