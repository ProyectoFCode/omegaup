import { shallowMount } from '@vue/test-utils';
import expect from 'expect';
import Vue from 'vue';

import T from '../../lang';
import { omegaup } from '../../omegaup';

import problem_SearchBar from './SearchBar.vue';

describe('SearchBar.vue', () => {
  it('Should handle empty initial values', async () => {
    const wrapper = shallowMount(problem_SearchBar, {
      propsData: {
        columns: ['title', 'quality', 'difficulty'],
        initialColumn: '',
        initialMode: '',
        initialLanguage: '',
        initialKeyword: '',
        languages: ['all', 'en', 'es', 'pt'],
        modes: ['asc', 'desc'],
        tags: [],
      },
    });

    expect(wrapper.text()).toContain(T.wordsFilterByLanguage);
    expect(wrapper.text()).toContain(T.wordsOrderBy);
    expect(wrapper.text()).toContain(T.wordsMode);
  });
});