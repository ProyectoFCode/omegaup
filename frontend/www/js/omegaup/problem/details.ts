import Vue from 'vue';
import problem_Details, {
  PopupDisplayed,
} from '../components/problem/Details.vue';
import qualitynomination_Demotion from '../components/qualitynomination/DemotionPopup.vue';
import qualitynomination_Promotion from '../components/qualitynomination/PromotionPopup.vue';
import { myRunsStore, runsStore, RunFilters } from '../arena/runsStore';
import { OmegaUp } from '../omegaup';
import { types } from '../api_types';
import * as api from '../api';
import * as ui from '../ui';
import * as time from '../time';
import T from '../lang';

OmegaUp.on('ready', () => {
  const payload = types.payloadParsers.ProblemDetailsv2Payload();
  const commonPayload = types.payloadParsers.CommonPayload();
  const locationHash = window.location.hash.substr(1).split('/');
  let popupDisplayed = PopupDisplayed.None;
  if (locationHash.includes('new-run')) {
    popupDisplayed = PopupDisplayed.RunSubmit;
  } else if (
    (payload.nominationStatus?.solved || payload.nominationStatus?.tried) &&
    !(
      payload.nominationStatus?.dismissed ||
      (payload.nominationStatus?.dismissedBeforeAc &&
        !payload.nominationStatus?.solved)
    ) &&
    !(
      payload.nominationStatus?.nominated ||
      (payload.nominationStatus?.nominatedBeforeAc &&
        !payload.nominationStatus?.solved)
    ) &&
    payload.nominationStatus?.canNominateProblem
  ) {
    popupDisplayed = PopupDisplayed.Promotion;
  }
  const runs =
    payload.user.admin && payload.allRuns ? payload.allRuns : payload.runs;
  if (runs) {
    for (const run of runs) {
      trackRun(run);
    }
  }
  if (payload.user.admin) {
    setInterval(() => {
      refreshRuns();
      refreshClarifications();
    }, 5 * 60 * 1000);
  }
  const problemDetailsView = new Vue({
    el: '#main-container',
    components: {
      'omegaup-problem-details': problem_Details,
    },
    data: () => ({
      initialClarifications: payload.clarifications,
      solutionStatus: payload.solutionStatus,
      solution: <types.ProblemStatement | null>null,
      availableTokens: 0,
      allTokens: 0,
      activeTab: window.location.hash ? locationHash[0] : 'problems',
      hasBeenNominated:
        payload.nominationStatus?.nominated ||
        (payload.nominationStatus?.nominatedBeforeAc &&
          !payload.nominationStatus?.solved),
    }),
    render: function (createElement) {
      return createElement('omegaup-problem-details', {
        props: {
          activeTab: this.activeTab,
          allRuns: runsStore.state.runs,
          problem: payload.problem,
          runs: myRunsStore.state.runs,
          solvers: payload.solvers,
          user: payload.user,
          nominationStatus: payload.nominationStatus,
          histogram: payload.histogram,
          initialClarifications: this.initialClarifications,
          solutionStatus: this.solutionStatus,
          solution: this.solution,
          availableTokens: this.availableTokens,
          allTokens: this.allTokens,
          initialPopupDisplayed: popupDisplayed,
          allowUserAddTags: payload.allowUserAddTags,
          levelTags: payload.levelTags,
          problemLevel: payload.problemLevel,
          publicTags: payload.publicTags,
          selectedPublicTags: payload.selectedPublicTags,
          selectedPrivateTags: payload.selectedPrivateTags,
          hasBeenNominated: this.hasBeenNominated,
        },
        on: {
          'apply-filter': (
            filter: 'verdict' | 'language' | 'username' | 'status',
            value: string,
          ) => {
            if (value) {
              runsStore.commit('applyFilter', {
                [filter]: value,
              } as RunFilters);
            } else {
              runsStore.commit('removeFilter', filter);
            }
            refreshRuns();
          },
          'submit-run': (code: string, language: string) => {
            api.Run.create({
              problem_alias: payload.problem.alias,
              language: language,
              source: code,
            })
              .then((response) => {
                ui.reportEvent('submission', 'submit');

                updateRun({
                  guid: response.guid,
                  submit_delay: response.submit_delay,
                  username: commonPayload.currentUsername,
                  classname: commonPayload.userClassname,
                  country: 'xx',
                  status: 'new',
                  alias: payload.problem.alias,
                  time: new Date(),
                  penalty: 0,
                  runtime: 0,
                  memory: 0,
                  verdict: 'JE',
                  score: 0,
                  language: language,
                });
              })
              .catch((run) => {
                ui.error(run.error ?? run);
                if (run.errorname) {
                  ui.reportEvent('submission', 'submit-fail', run.errorname);
                }
              });
          },
          'submit-reviewer': (tag: string, qualitySeal: boolean) => {
            const contents: { quality_seal?: boolean; tag?: string } = {};
            if (tag) {
              contents.tag = tag;
            }
            contents.quality_seal = qualitySeal;
            api.QualityNomination.create({
              problem_alias: payload.problem.alias,
              nomination: 'quality_tag',
              contents: JSON.stringify(contents),
            }).catch(ui.apiError);
          },
          'submit-demotion': (source: qualitynomination_Demotion) => {
            api.QualityNomination.create({
              problem_alias: payload.problem.alias,
              nomination: 'demotion',
              contents: JSON.stringify({
                rationale: source.rationale || 'N/A',
                reason: source.selectedReason,
                original: source.original,
              }),
            }).catch(ui.apiError);
          },
          'submit-promotion': (source: qualitynomination_Promotion) => {
            const contents: {
              before_ac?: boolean;
              difficulty?: number;
              quality?: number;
              tags?: string[];
            } = {};
            if (!source.solved && source.tried) {
              contents.before_ac = true;
            }
            if (source.difficulty !== '') {
              contents.difficulty = Number.parseInt(source.difficulty, 10);
            }
            if (source.tags.length > 0) {
              contents.tags = source.tags;
            }
            if (source.quality !== '') {
              contents.quality = Number.parseInt(source.quality, 10);
            }
            api.QualityNomination.create({
              problem_alias: payload.problem.alias,
              nomination: 'suggestion',
              contents: JSON.stringify(contents),
            })
              .then(() => {
                this.hasBeenNominated = true;
                ui.dismissNotifications();
              })
              .catch(ui.apiError);
          },
          'dismiss-promotion': (
            source: qualitynomination_Promotion,
            isDismissed: boolean,
          ) => {
            const contents: { before_ac?: boolean } = {};
            if (!source.solved && source.tried) {
              contents.before_ac = true;
            }
            if (!isDismissed) {
              return;
            }
            api.QualityNomination.create({
              problem_alias: payload.problem.alias,
              nomination: 'dismissal',
              contents: JSON.stringify(contents),
            })
              .then(() => {
                ui.info(T.qualityNominationRateProblemDesc);
              })
              .catch(ui.apiError);
          },
          'unlock-solution': () => {
            api.Problem.solution(
              {
                problem_alias: payload.problem.alias,
                forfeit_problem: true,
              },
              { quiet: true },
            )
              .then((data) => {
                if (!data.solution) {
                  ui.error(T.wordsProblemOrSolutionNotExist);
                  return;
                }
                this.solutionStatus = 'unlocked';
                this.solution = data.solution;
                ui.info(
                  ui.formatString(T.solutionTokens, {
                    available: this.availableTokens - 1,
                    total: this.allTokens,
                  }),
                );
              })
              .catch((error) => {
                if (error.httpStatusCode == 404) {
                  ui.error(T.wordsProblemOrSolutionNotExist);
                  return;
                }
                ui.apiError(error);
              });
          },
          'get-tokens': () => {
            api.ProblemForfeited.getCounts()
              .then((data) => {
                this.allTokens = data.allowed;
                this.availableTokens = data.allowed - data.seen;
                if (this.availableTokens <= 0) {
                  ui.warning(T.solutionNoTokens);
                }
              })
              .catch(ui.apiError);
          },
          'get-solution': () => {
            if (payload.solutionStatus === 'unlocked') {
              api.Problem.solution(
                { problem_alias: payload.problem.alias },
                { quiet: true },
              )
                .then((data) => {
                  if (!data.solution) {
                    ui.error(T.wordsProblemOrSolutionNotExist);
                    return;
                  }
                  this.solution = data.solution;
                })
                .catch((error) => {
                  if (error.httpStatusCode == 404) {
                    ui.error(T.wordsProblemOrSolutionNotExist);
                    return;
                  }
                  ui.apiError(error);
                });
            }
          },
          'clarification-response': (
            id: number,
            responseText: string,
            isPublic: boolean,
          ) => {
            api.Clarification.update({
              clarification_id: id,
              answer: responseText,
              public: isPublic,
            })
              .then(() => {
                api.Problem.clarifications({
                  problem_alias: payload.problem.alias,
                })
                  .then(time.remoteTimeAdapter)
                  .then(
                    (response) =>
                      (this.initialClarifications = response.clarifications),
                  )
                  .catch(ui.apiError);
              })
              .catch(ui.apiError);
          },
          'update:activeTab': (tabName: string) => {
            window.location.replace(`#${tabName}`);
          },
          'redirect-login-page': () => {
            window.location.href = `/login/?redirect=${escape(
              window.location.pathname,
            )}`;
          },
        },
      });
    },
  });

  function updateRun(run: types.Run): void {
    trackRun(run);

    // TODO: Implement websocket support

    if (run.status != 'ready') {
      updateRunFallback(run.guid);
      return;
    }
  }

  function updateRunFallback(guid: string): void {
    setTimeout(() => {
      api.Run.status({ run_alias: guid })
        .then(time.remoteTimeAdapter)
        .then((response) => updateRun(response))
        .catch(ui.ignoreError);
    }, 5000);
  }

  function trackRun(run: types.Run): void {
    runsStore.commit('addRun', run);
    if (run.username !== OmegaUp.username) {
      return;
    }
    myRunsStore.commit('addRun', run);
  }

  function refreshRuns(): void {
    api.Problem.runs({
      problem_alias: payload.problem.alias,
      show_all: true,
      offset: runsStore.state.filters?.offset,
      rowcount: runsStore.state.filters?.rowcount,
      verdict: runsStore.state.filters?.verdict,
      language: runsStore.state.filters?.language,
      username: runsStore.state.filters?.username,
      status: runsStore.state.filters?.status,
    })
      .then(time.remoteTimeAdapter)
      .then((response) => {
        runsStore.commit('clear');
        for (const run of response.runs) {
          trackRun(run);
        }
      })
      .catch(ui.apiError);
  }

  function refreshClarifications(): void {
    api.Problem.clarifications({
      problem_alias: payload.problem.alias,
      offset: 0, // TODO: Updating offset is missing
      rowcount: 0, // TODO: Updating rowcount is missing
    })
      .then(time.remoteTimeAdapter)
      .then(
        (response) =>
          (problemDetailsView.initialClarifications = response.clarifications),
      )
      .catch(ui.apiError);
  }
});
